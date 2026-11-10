// Maps NAICS codes (Comptroller) and TDLR license types to the industry tags
// already used in GoHighLevel, plus a default service line.

const NAICS_PREFIXES = [
  ['621210', 'dental'],
  ['6211', 'medical'], ['6213', 'medical'], ['6214', 'medical'], ['6219', 'medical'], ['6216', 'medical'],
  ['54194', 'veterinary'],
  ['5411', 'legal'],
  ['5312', 'real estate'], ['5313', 'real estate'],
  ['5242', 'insurance'],
  ['5239', 'financial'], ['5232', 'financial'],
  ['5613', 'staffing'],
  ['238220', 'hvac'],
  ['238210', 'electrical'],
  ['238160', 'roofing'],
  ['561730', 'landscaping'],
  ['561710', 'pest control'],
  ['561720', 'cleaning'], ['561790', 'cleaning'],
  ['2361', 'construction'], ['2362', 'construction'], ['237', 'construction'], ['238', 'construction'],
  ['4411', 'auto'], ['4412', 'auto'], ['8111', 'auto'], ['48841', 'towing'],
  ['8121', 'salon'], ['71394', 'fitness'], ['62139', 'chiropractic'],
  ['7225', 'restaurant'], ['7224', 'restaurant'], ['7211', 'hotel'],
];

// Only business level licenses. Individual technician and apprentice licenses
// are skipped because they are people, not businesses.
const TDLR_TYPES = {
  'A/C Contractor': 'hvac',
  'Electrical Contractor': 'electrical',
  'Electrical Sign Contractor': 'electrical',
  'Appliance Installation Contractor': 'hvac',
  'Full Service Establishment': 'salon',
  'Mini Establishment': 'salon',
  'Manicurist/Esthetician Establishment': 'salon',
  'Esthetician Establishment': 'salon',
  'Manicurist Establishment': 'salon',
  'Eyelash Extension Establishment': 'salon',
  'Barber Shop': 'salon',
  'Tow Company': 'towing',
  'Vehicle Storage Facility': 'towing',
};

export const TDLR_BUSINESS_LICENSE_TYPES = Object.keys(TDLR_TYPES);

export function industryFromNaics(code) {
  if (!code) return null;
  const c = String(code);
  let best = null;
  for (const [prefix, tag] of NAICS_PREFIXES) {
    if (c.startsWith(prefix) && (!best || prefix.length > best[0].length)) best = [prefix, tag];
  }
  return best ? best[1] : null;
}

export function industryFromLicense(type) {
  return TDLR_TYPES[type] || null;
}

// Same three service lines the GHL scoring task uses.
export function serviceLine(lead) {
  if (lead.isNewBusiness) return 'marketing';
  if (!lead.website) return 'marketing';
  if (['medical', 'dental', 'legal', 'financial', 'insurance', 'staffing'].includes(lead.industry)) return 'consulting';
  return 'ai implementation';
}
