// Texas Department of Licensing and Regulation, "TDLR All Licenses"
// (data.texas.gov dataset 7358-krk7). Public record with the business phone
// number, which is what the old Google Maps scrape was mostly used for.
import { querySocrata, soqlList } from './socrata.js';
import { TDLR_BUSINESS_LICENSE_TYPES, industryFromLicense } from '../industry.js';
import { cleanPhone, titleCase, splitCityStateZip } from '../normalize.js';

export const DATASET = '7358-krk7';

export function buildWhere(job) {
  return `business_county in(${soqlList(job.tdlr_counties)}) AND license_type in(${soqlList(TDLR_BUSINESS_LICENSE_TYPES)})`;
}

function notExpired(mmddyyyy, today) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(mmddyyyy || '');
  if (!m) return false;
  return new Date(`${m[3]}-${m[1]}-${m[2]}T23:59:59Z`) >= today;
}

export function toLead(row, job, today = new Date()) {
  if (!notExpired(row.license_expiration_date_mmddccyy, today)) return null;
  const { city, state, zip } = splitCityStateZip(row.business_city_state_zip);
  if (job.tdlr_city_filter && city && !job.tdlr_city_filter.includes(city)) return null;
  const industry = industryFromLicense(row.license_type);
  const owner = String(row.owner_name || '').trim();
  const [first, ...rest] = owner.includes(',') ? owner.split(',').reverse().map(s => s.trim()) : owner.split(/\s+/);
  return {
    source: 'tdlr',
    sourceId: `tdlr:${row.license_number}`,
    companyName: titleCase(row.business_name),
    firstName: titleCase(first || ''),
    lastName: titleCase(rest.join(' ')),
    phone: cleanPhone(row.business_telephone),
    address1: titleCase([row.business_address_line1, row.business_address_line2].filter(Boolean).join(' ')),
    city: titleCase(city), state, postalCode: zip,
    county: titleCase(row.business_county),
    industry,
    website: null,
    email: null,
    isNewBusiness: false,
    tags: ['lead engine', 'source tdlr', industry, job.area.toLowerCase(), `license ${String(row.license_type).toLowerCase()}`].filter(Boolean),
  };
}

export async function fetchTdlr(job, opts = {}) {
  const rows = await querySocrata(DATASET, buildWhere(job), opts);
  return rows.map(r => toLead(r, job, opts.today)).filter(Boolean);
}
