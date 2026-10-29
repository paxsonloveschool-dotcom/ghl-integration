// Finds a business's own website and public contact email without touching
// Google. It guesses likely domains from the business name, keeps a domain
// only if the homepage mentions the business's city or phone, honors
// robots.txt, and reads emails and phones from the homepage and /contact.
import { getText } from './http.js';
import { cleanPhone } from './normalize.js';

const STOP = new Set(['llc', 'inc', 'co', 'company', 'corp', 'ltd', 'pllc', 'the', 'and', 'of', 'dba']);

export function candidateDomains(name) {
  const words = String(name || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/).filter(w => w && !STOP.has(w));
  if (!words.length) return [];
  const joined = words.join('');
  const out = new Set([`${joined}.com`, `${words.join('-')}.com`, `${joined}tx.com`, `${joined}.net`]);
  if (words.length > 2) out.add(`${words.slice(0, 2).join('')}.com`);
  return [...out].filter(d => d.length <= 63 + 4);
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const JUNK_EMAIL = /(example|sentry|wixpress|domain\.com|email\.com|yourname|\.png|\.jpg|\.webp|\.svg)/i;

export function extractContacts(html, domain) {
  const text = String(html || '');
  const emails = [...new Set((text.match(EMAIL_RE) || []).map(e => e.toLowerCase()))]
    .filter(e => !JUNK_EMAIL.test(e));
  // Prefer an address on the business's own domain.
  emails.sort((a, b) => (b.endsWith(`@${domain}`) ? 1 : 0) - (a.endsWith(`@${domain}`) ? 1 : 0));
  const phones = [...new Set((text.match(PHONE_RE) || []).map(cleanPhone).filter(Boolean))];
  return { emails, phones };
}

export function robotsAllows(robotsTxt, path = '/') {
  let applies = false;
  const disallows = [];
  for (const line of String(robotsTxt || '').split(/\r?\n/)) {
    const [k, ...v] = line.split(':');
    const key = k.trim().toLowerCase();
    const val = v.join(':').trim();
    if (key === 'user-agent') applies = val === '*' || /restoreleadengine/i.test(val);
    else if (applies && key === 'disallow' && val) disallows.push(val);
  }
  return !disallows.some(d => path.startsWith(d));
}

export async function enrichLead(lead, { fetchText = getText } = {}) {
  if (lead.website && lead.email) return lead;
  const cityWord = String(lead.city || '').toLowerCase();
  const phoneDigits = lead.phone ? lead.phone.slice(-10) : null;
  for (const domain of lead.website ? [new URL(lead.website).hostname] : candidateDomains(lead.companyName)) {
    const base = `https://${domain}`;
    try {
      const robots = await fetchText(`${base}/robots.txt`, { timeoutMs: 8000 });
      if (robots.status === 200 && !robotsAllows(robots.text, '/')) continue;
      const home = await fetchText(`${base}/`, { timeoutMs: 10000 });
      if (home.status !== 200 || !home.text) continue;
      const flat = home.text.toLowerCase();
      const digitsOnly = flat.replace(/\D/g, '');
      const matches = (cityWord && flat.includes(cityWord)) || (phoneDigits && digitsOnly.includes(phoneDigits));
      if (!lead.website && !matches) continue;
      let { emails, phones } = extractContacts(home.text, domain);
      if (!emails.length && (robots.status !== 200 || robotsAllows(robots.text, '/contact'))) {
        const contact = await fetchText(`${base}/contact`, { timeoutMs: 10000 });
        if (contact.status === 200) ({ emails, phones } = extractContacts(home.text + contact.text, domain));
      }
      return {
        ...lead,
        website: lead.website || base,
        email: lead.email || emails[0] || null,
        phone: lead.phone || phones[0] || null,
        tags: [...lead.tags, 'website found'],
      };
    } catch {
      // Unreachable or not a real site: try the next candidate.
    }
  }
  return { ...lead, tags: [...lead.tags, 'no website found'] };
}
