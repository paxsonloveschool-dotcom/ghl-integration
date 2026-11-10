// Texas Comptroller "Active Sales Tax Permit Holders" (data.texas.gov
// dataset jrea-zgmq). Filtering on a recent permit issue date gives a feed of
// brand new businesses, the best fit for marketing and branding offers.
import { querySocrata, soqlList } from './socrata.js';
import { industryFromNaics } from '../industry.js';
import { titleCase } from '../normalize.js';

export const DATASET = 'jrea-zgmq';

export function buildWhere(job, today = new Date()) {
  const since = new Date(today.getTime() - job.days * 86400000).toISOString().slice(0, 10);
  return `outlet_county_code in(${soqlList(job.comptroller_counties)}) AND outlet_permit_issue_date >= '${since}T00:00:00'`;
}

export function toLead(row, job) {
  const city = String(row.outlet_city || '').toUpperCase();
  if (job.city_filter && !job.city_filter.includes(city)) return null;
  const industry = industryFromNaics(row.outlet_naics_code);
  return {
    source: 'tx-sales-tax',
    sourceId: `txst:${row.taxpayer_number}-${row.outlet_number}`,
    companyName: titleCase(row.outlet_name),
    firstName: '', lastName: '',
    phone: null,
    address1: titleCase(row.outlet_address),
    city: titleCase(row.outlet_city), state: row.outlet_state, postalCode: row.outlet_zip_code,
    county: null,
    industry,
    naics: row.outlet_naics_code,
    permitIssued: (row.outlet_permit_issue_date || '').slice(0, 10),
    website: null,
    email: null,
    isNewBusiness: true,
    tags: ['lead engine', 'source tx sales tax', 'new business', industry, job.area.toLowerCase(), `naics ${row.outlet_naics_code}`].filter(Boolean),
  };
}

export async function fetchSalesTax(job, opts = {}) {
  const rows = await querySocrata(DATASET, buildWhere(job, opts.today), opts);
  return rows.map(r => toLead(r, job)).filter(Boolean);
}
