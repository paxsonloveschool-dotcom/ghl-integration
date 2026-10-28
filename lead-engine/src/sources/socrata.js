import { getJson } from '../http.js';

const HOST = 'https://data.texas.gov/resource';

export function soqlList(values) {
  return values.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',');
}

// Pages through a data.texas.gov dataset. No account is needed; an optional
// free app token (SOCRATA_APP_TOKEN) only raises the rate limit.
export async function querySocrata(datasetId, where, { pageSize = 1000, max = 20000, fetchImpl = getJson } = {}) {
  const rows = [];
  const headers = process.env.SOCRATA_APP_TOKEN ? { 'X-App-Token': process.env.SOCRATA_APP_TOKEN } : {};
  for (let offset = 0; offset < max; offset += pageSize) {
    const url = `${HOST}/${datasetId}.json?$where=${encodeURIComponent(where)}&$limit=${pageSize}&$offset=${offset}&$order=:id`;
    const page = await fetchImpl(url, { headers });
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}
