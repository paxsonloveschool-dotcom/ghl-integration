import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanPhone, splitCityStateZip, dedupe } from '../src/normalize.js';
import { industryFromNaics } from '../src/industry.js';
import { candidateDomains, extractContacts, robotsAllows, enrichLead } from '../src/enrich.js';
import { buildWhere as tdlrWhere } from '../src/sources/tdlr.js';
import { buildWhere as stWhere } from '../src/sources/salesTax.js';
import { toGhlContact, pushLeads } from '../src/ghl.js';
import { runJob } from '../src/run.js';

const FIX = new URL('./fixtures', import.meta.url).pathname;
const TODAY = new Date('2026-10-28T12:00:00Z');

test('phones normalize to E.164 and junk is dropped', () => {
  assert.equal(cleanPhone('(979) 555-0101'), '+19795550101');
  assert.equal(cleanPhone('1-979-555-0101'), '+19795550101');
  assert.equal(cleanPhone('0000000000'), null);
  assert.equal(cleanPhone('555'), null);
});

test('city state zip split', () => {
  assert.deepEqual(splitCityStateZip('COLLEGE STATION, TX 77840-1234'), { city: 'COLLEGE STATION', state: 'TX', zip: '77840' });
});

test('NAICS maps to existing GHL industry tags, longest prefix wins', () => {
  assert.equal(industryFromNaics('621210'), 'dental');
  assert.equal(industryFromNaics('621111'), 'medical');
  assert.equal(industryFromNaics('238220'), 'hvac');
  assert.equal(industryFromNaics('238990'), 'construction');
  assert.equal(industryFromNaics('999999'), null);
});

test('SoQL filters are built from the job config', () => {
  assert.match(tdlrWhere({ tdlr_counties: ['BRAZOS'] }), /business_county in\('BRAZOS'\)/);
  assert.match(tdlrWhere({ tdlr_counties: ['BRAZOS'] }), /'A\/C Contractor'/);
  assert.equal(stWhere({ comptroller_counties: ['021'], days: 7 }, TODAY), "outlet_county_code in('021') AND outlet_permit_issue_date >= '2026-10-21T00:00:00'");
});

test('dedupe merges the same business seen twice', () => {
  const a = { companyName: 'Sample Air & Heat LLC', phone: '+19795550101', tags: ['x'] };
  const b = { companyName: 'Sample Air & Heat, L.L.C.', phone: '+19795550101', email: 'a@b.com', tags: ['y'] };
  const out = dedupe([a, b]);
  assert.equal(out.length, 1);
  assert.equal(out[0].email, 'a@b.com');
  assert.deepEqual(out[0].tags.sort(), ['x', 'y']);
});

test('domain guesses and contact extraction', () => {
  assert.ok(candidateDomains('Botanical Landworks').includes('botanicallandworks.com'));
  const { emails, phones } = extractContacts('Call (979) 555-0199 or mail info@acme.com, x@wixpress.com', 'acme.com');
  assert.deepEqual(emails, ['info@acme.com']);
  assert.deepEqual(phones, ['+19795550199']);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /private', '/'), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /', '/'), false);
});

test('enrichment keeps a site only when it matches the business', async () => {
  const pages = {
    'https://botanicallandworks.com/robots.txt': { status: 404, text: '' },
    'https://botanicallandworks.com/': { status: 200, text: '<p>Landscaping in College Station. hello@botanicallandworks.com</p>' },
  };
  const fetchText = async url => pages[url] || { status: 404, text: '' };
  const lead = { companyName: 'Botanical Landworks', city: 'College Station', tags: [] };
  const out = await enrichLead(lead, { fetchText });
  assert.equal(out.website, 'https://botanicallandworks.com');
  assert.equal(out.email, 'hello@botanicallandworks.com');
  const none = await enrichLead({ companyName: 'Nowhere Biz', city: 'Bryan', tags: [] }, { fetchText });
  assert.ok(none.tags.includes('no website found'));
});

test('GHL payload and dry run write nothing', async () => {
  const lead = { companyName: 'Fixture Electric Inc', firstName: 'Richard', lastName: 'Roe', phone: '+19795550102', tags: ['lead engine'], serviceLine: 'marketing', source: 'tdlr' };
  const c = toGhlContact(lead, 'LOC', '2026-10-28');
  assert.equal(c.locationId, 'LOC');
  assert.ok(c.tags.includes('marketing'));
  let calls = 0;
  const r = await pushLeads([lead, { companyName: 'No Contact', tags: [] }], { token: 't', locationId: 'LOC', push: false, date: 'd', fetchImpl: async () => { calls++; return { ok: true }; } });
  assert.equal(calls, 0);
  assert.equal(r.attempted, 1);
  assert.equal(r.skippedNoContact, 1);
});

test('full job on fixtures: filters expired, dedupes, routes to brands', async () => {
  const out = mkdtempSync(join(tmpdir(), 'le-'));
  const s = await runJob({ job: 'brazos-valley', sources: ['tdlr', 'salestax'], fixtures: FIX, out, today: TODAY });
  assert.equal(s.fromSource.tdlr, 3);          // expired salon dropped
  assert.equal(s.fromSource.salestax, 2);
  assert.equal(s.afterDedupe, 4);              // two Sample Air rows merged
  assert.equal(s.newBusinesses, 2);
  assert.equal(s.byBrand['restore-marketing'], 4);
  assert.equal(s.byBrand['pax-scales'], 3);    // hvac, electrical, landscaping
  assert.equal(s.byBrand['restore-ai'], 1);    // dental
  assert.equal(s.mode, 'dry run');
  const csv = readFileSync(s.files[0], 'utf8');
  assert.match(csv, /Botanical Landworks/);
});

test('city filter on the College Station job drops Bryan rows', async () => {
  const out = mkdtempSync(join(tmpdir(), 'le-'));
  const s = await runJob({ job: 'college-station', sources: ['tdlr', 'salestax'], fixtures: FIX, out, today: TODAY });
  assert.equal(s.afterDedupe, 2); // Fixture Electric and Botanical Landworks
});
