export function cleanPhone(raw) {
  if (!raw) return null;
  const d = String(raw).replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  if (d.length !== 10 || /^(\d)\1{9}$/.test(d) || d.startsWith('0')) return null;
  return `+1${d}`;
}

export function titleCase(s) {
  if (!s) return s;
  return String(s).toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase())
    .replace(/\b(Llc|Pllc|Lp|Llp|Dds|Md)\b/g, m => m.toUpperCase());
}

// "BRYAN, TX 77802-1234" -> { city, state, zip }
export function splitCityStateZip(s) {
  const m = /^\s*(.*?),?\s+([A-Z]{2})\s+(\d{5})/.exec(String(s || '').toUpperCase());
  return m ? { city: m[1].trim(), state: m[2], zip: m[3] } : { city: null, state: null, zip: null };
}

export function dedupeKey(lead) {
  const name = String(lead.companyName || '').toLowerCase()
    .replace(/\b([a-z])\.(?=[a-z]\.)/g, '$1').replace(/[^a-z0-9& ]/g, ' ')
    .replace(/\b(llc|inc|co|company|corp|ltd|pllc|the)\b/g, '').replace(/[^a-z0-9]/g, '');
  return lead.phone ? `${name}|${lead.phone}` : `${name}|${String(lead.address1 || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

export function dedupe(leads) {
  const seen = new Map();
  for (const l of leads) {
    const k = dedupeKey(l);
    const prev = seen.get(k);
    if (!prev) seen.set(k, l);
    else seen.set(k, { ...prev, ...Object.fromEntries(Object.entries(l).filter(([, v]) => v != null && v !== '')), tags: [...new Set([...prev.tags, ...l.tags])] });
  }
  return [...seen.values()];
}
