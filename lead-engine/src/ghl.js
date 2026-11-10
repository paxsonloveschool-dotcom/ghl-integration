// Writes leads to GoHighLevel with the upsert endpoint, which matches on phone
// or email so reruns update a contact instead of duplicating it. Nothing is
// written unless push is true; the default is a dry run.
import { UA } from './http.js';

const BASE = 'https://services.leadconnectorhq.com';

export function toGhlContact(lead, locationId, date) {
  return {
    locationId,
    firstName: lead.firstName || undefined,
    lastName: lead.lastName || undefined,
    name: lead.firstName ? undefined : lead.companyName,
    companyName: lead.companyName,
    phone: lead.phone || undefined,
    email: lead.email || undefined,
    address1: lead.address1 || undefined,
    city: lead.city || undefined,
    state: lead.state || undefined,
    postalCode: lead.postalCode || undefined,
    website: lead.website || undefined,
    source: `lead engine ${lead.source}`,
    tags: [...new Set([...lead.tags, lead.serviceLine, date])].filter(Boolean),
  };
}

export async function pushLeads(leads, { token, locationId, push = false, date, fetchImpl = fetch }) {
  const result = { attempted: 0, written: 0, skippedNoContact: 0, errors: [] };
  for (const lead of leads) {
    if (!lead.phone && !lead.email) { result.skippedNoContact++; continue; }
    result.attempted++;
    if (!push) continue;
    const res = await fetchImpl(`${BASE}/contacts/upsert`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Version: '2021-07-28', 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA },
      body: JSON.stringify(toGhlContact(lead, locationId, date)),
    });
    if (res.ok) result.written++;
    else result.errors.push(`${lead.companyName}: HTTP ${res.status}`);
    await new Promise(r => setTimeout(r, 150)); // stays under GHL's burst limit
  }
  return result;
}
