// Overture Maps Places (overturemaps.org), free under CDLA Permissive 2.0.
// scripts/overture_places.py pulls one job's area from the public S3 bucket
// into a JSON file; this turns those places into leads. Only categories that
// map to an industry the brands sell to are kept, so parks, churches and
// schools never reach the CRM. Quality is mixed, so it runs after the state
// records and the shared dedupe merges matches.
import { readFileSync } from 'node:fs';
import { cleanPhone, titleCase } from '../normalize.js';

// Checked in order, first match wins. Keys are Overture category names.
const CATEGORY_RULES = [
  [/dentist|dental|orthodont|endodont|periodont/, 'dental'],
  [/veterinar|animal_hospital/, 'veterinary'],
  [/chiropract/, 'chiropractic'],
  [/doctor|physician|medical|clinic|urgent_care|hospital|pediatric|dermatolog|cardiolog|physical_therap|optometr/, 'medical'],
  [/lawyer|attorney|law_firm|legal_service/, 'legal'],
  [/real_estate|property_management|realtor/, 'real estate'],
  [/insurance/, 'insurance'],
  [/financial|accountant|accounting|tax_service|bookkeep|mortgage/, 'financial'],
  [/employment_agenc|staffing|recruit/, 'staffing'],
  [/hvac|heating|air_condition/, 'hvac'],
  [/electrician|electrical/, 'electrical'],
  [/plumb/, 'plumbing'],
  [/roof/, 'roofing'],
  [/pool/, 'pools'],
  [/landscap|lawn|gardener|tree_service|irrigation/, 'landscaping'],
  [/pest_control|exterminat/, 'pest control'],
  [/cleaning|janitorial|maid|pressure_wash|window_wash/, 'cleaning'],
  [/towing/, 'towing'],
  [/auto|car_dealer|car_repair|mechanic|tire|body_shop|oil_change/, 'auto'],
  [/contractor|construction|builder|remodel|concrete|fence|deck|paving|masonry|handyman/, 'construction'],
  [/salon|barber|spa|nail|beauty|esthetic|lash/, 'salon'],
  [/gym|fitness|yoga|pilates|crossfit/, 'fitness'],
  [/restaurant|cafe|coffee|bakery|bar_and_grill|pizza|diner/, 'restaurant'],
  [/hotel|motel|inn|bed_and_breakfast/, 'hotel'],
];

export function industryFromCategory(cat) {
  const c = String(cat || '').toLowerCase();
  if (!c) return null;
  for (const [re, tag] of CATEGORY_RULES) if (re.test(c)) return tag;
  return null;
}

function cleanUrl(u) {
  if (!u) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`);
    if (/facebook\.com|instagram\.com|yelp\.com|google\.|linktr\.ee/.test(url.hostname)) return null;
    return `${url.protocol}//${url.hostname}`;
  } catch { return null; }
}

export function toLead(p, job) {
  const industry = industryFromCategory(p.category);
  if (!industry) return null;
  const city = String(p.city || '').toUpperCase();
  if (job.city_filter && city && !job.city_filter.includes(city)) return null;
  const phone = cleanPhone(p.phone);
  const website = cleanUrl(p.website);
  const email = p.email && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(p.email) ? p.email.toLowerCase() : null;
  if (!phone && !email && !website) return null;
  return {
    source: 'overture',
    sourceId: `overture:${p.id}`,
    companyName: String(p.name || '').trim(),
    firstName: '', lastName: '',
    phone, email, website,
    address1: p.address || '',
    city: titleCase(p.city || ''), state: 'TX', postalCode: String(p.postcode || '').slice(0, 5),
    industry,
    isNewBusiness: false,
    tags: ['lead engine', 'source overture', industry, job.area.toLowerCase(), website ? 'website found' : null].filter(Boolean),
  };
}

export function fetchOverture(job, opts = {}) {
  const file = opts.file;
  if (!file) return [];
  const { places = [] } = JSON.parse(readFileSync(file, 'utf8'));
  return places.map(p => toLead(p, job)).filter(l => l && l.companyName);
}
