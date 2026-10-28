#!/usr/bin/env node
// Usage:
//   node src/run.js --job college-station [--sources tdlr,salestax] [--enrich] [--push] [--fixtures test/fixtures] [--out out]
// Without --push nothing is written to GoHighLevel; leads land in out/ as CSV and JSON.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchTdlr } from './sources/tdlr.js';
import { fetchSalesTax } from './sources/salesTax.js';
import { enrichLead } from './enrich.js';
import { dedupe } from './normalize.js';
import { serviceLine } from './industry.js';
import { pushLeads } from './ghl.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function parseArgs(argv) {
  const a = { sources: ['tdlr', 'salestax'], enrich: false, enrichLimit: 120, push: false, out: 'out' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--job') a.job = argv[++i];
    else if (k === '--sources') a.sources = argv[++i].split(',');
    else if (k === '--enrich') a.enrich = true;
    else if (k === '--push') a.push = true;
    else if (k === '--fixtures') a.fixtures = argv[++i];
    else if (k === '--out') a.out = argv[++i];
    else if (k === '--today') a.today = new Date(argv[++i]);
    else if (k === '--enrich-limit') a.enrichLimit = Number(argv[++i]);
    else if (k === '--summary-only') a.summaryOnly = true;
  }
  return a;
}

export function routeToBrands(lead, brands) {
  return Object.entries(brands).filter(([k, b]) => !k.startsWith('_') &&
    (b.industries === '*' || (lead.industry && b.industries.includes(lead.industry)))).map(([k]) => k);
}

const CSV_COLS = ['companyName', 'firstName', 'lastName', 'phone', 'email', 'website', 'address1', 'city', 'state', 'postalCode', 'industry', 'serviceLine', 'brands', 'source', 'permitIssued', 'tags'];
export function toCsv(leads) {
  const esc = v => { const s = Array.isArray(v) ? v.join('; ') : (v ?? ''); return /[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s); };
  return [CSV_COLS.join(','), ...leads.map(l => CSV_COLS.map(c => esc(l[c])).join(','))].join('\n') + '\n';
}

export async function runJob(args) {
  const jobs = JSON.parse(readFileSync(join(ROOT, 'config/jobs.json'), 'utf8'));
  const brands = JSON.parse(readFileSync(join(ROOT, 'config/brands.json'), 'utf8'));
  const job = jobs[args.job];
  if (!job) throw new Error(`Unknown job "${args.job}". Jobs: ${Object.keys(jobs).filter(k => !k.startsWith('_')).join(', ')}`);
  const today = args.today || new Date();
  const fixtureFetch = name => async () => JSON.parse(readFileSync(join(args.fixtures, `${name}.json`), 'utf8'));
  const opts = name => ({ today, ...(args.fixtures ? { fetchImpl: fixtureFetch(name), max: 1 } : {}) });

  let leads = [];
  const counts = {};
  if (args.sources.includes('tdlr')) { const l = await fetchTdlr(job, opts('tdlr')); counts.tdlr = l.length; leads.push(...l); }
  if (args.sources.includes('salestax')) { const l = await fetchSalesTax(job, opts('salestax')); counts.salestax = l.length; leads.push(...l); }
  leads = dedupe(leads);
  let enriched = 0;
  if (args.enrich) {
    // New businesses first, then anyone without a phone; capped so a run stays short.
    const order = [...leads.keys()].sort((a, b) => (leads[b].isNewBusiness - leads[a].isNewBusiness) || (!leads[b].phone - !leads[a].phone));
    const pick = order.slice(0, args.enrichLimit ?? 120);
    for (let i = 0; i < pick.length; i += 8) {
      const batch = pick.slice(i, i + 8);
      const done = await Promise.all(batch.map(idx => enrichLead(leads[idx])));
      batch.forEach((idx, j) => { leads[idx] = done[j]; });
    }
    enriched = pick.length;
  }
  leads = leads.map(l => ({ ...l, serviceLine: serviceLine(l), brands: routeToBrands(l, brands) }));

  const date = today.toISOString().slice(0, 10);
  mkdirSync(args.out, { recursive: true });
  const base = join(args.out, `leads-${args.job}-${date}`);
  writeFileSync(`${base}.csv`, toCsv(leads));
  writeFileSync(`${base}.json`, JSON.stringify(leads, null, 2));

  const pushes = {};
  for (const [key, brand] of Object.entries(brands)) {
    if (key.startsWith('_')) continue;
    const locationId = process.env[brand.ghl_location_env];
    if (!locationId) continue;
    const mine = leads.filter(l => l.brands.includes(key));
    pushes[key] = await pushLeads(mine, { token: process.env.GHL_TOKEN, locationId, push: args.push && !!process.env.GHL_TOKEN, date });
  }

  const summary = {
    job: args.job, date, mode: args.push ? 'push' : 'dry run',
    fromSource: counts, afterDedupe: leads.length,
    withPhone: leads.filter(l => l.phone).length,
    withEmail: leads.filter(l => l.email).length,
    newBusinesses: leads.filter(l => l.isNewBusiness).length,
    websiteChecked: enriched,
    websiteFound: leads.filter(l => l.tags.includes('website found')).length,
    byIndustry: leads.reduce((m, l) => (m[l.industry || 'other'] = (m[l.industry || 'other'] || 0) + 1, m), {}),
    byBrand: Object.fromEntries(Object.keys(brands).filter(k => !k.startsWith('_')).map(k => [k, leads.filter(l => l.brands.includes(k)).length])),
    ghl: pushes,
    files: [`${base}.csv`, `${base}.json`],
  };
  writeFileSync(`${base}.summary.json`, JSON.stringify(summary, null, 2));
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runJob(parseArgs(process.argv.slice(2)))
    .then(s => console.log(JSON.stringify(process.argv.includes('--summary-only') ? { ...s, files: undefined } : s, null, 2)))
    .catch(e => { console.error(e.message); process.exit(1); });
}
