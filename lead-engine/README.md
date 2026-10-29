# Restore lead engine

Free replacement for the Apify Google Maps scrapes that fed GoHighLevel. Built 2026-10-28.

## What it replaces

| Old routine (Apify actor nwua9Gu5YrADL7ZDj) | New job |
| --- | --- |
| Daily lead scrape, Mon/Thu College Station blitz | `college-station` |
| Daily lead scrape, Tue/Fri Bryan blitz | `bryan` |
| Daily lead scrape, Wed/Sat Chamber of Commerce batch | `brazos-valley` (whole region) |
| Houston market expansion (90 queries) | `houston` (Harris, Fort Bend, Montgomery, Brazoria, Galveston) |

Weekly lead report and GHL contact cleanup only read GoHighLevel and keep working as they are.

## Where the leads come from

1. **TDLR license holders** (data.texas.gov `7358-krk7`): every licensed A/C contractor, electrical contractor, salon, barber shop, tow company in the target counties, with the business phone and owner name. Public record, no account.
2. **New sales tax permits** (Texas Comptroller, data.texas.gov `jrea-zgmq`): businesses that opened in the last 7 to 30 days, with address and industry code. The hottest list for branding and marketing: they have no site, no reviews and no agency yet. No phone, so these go to the CSV for door to door and for enrichment.
3. **Website enrichment** (`--enrich`): guesses the business's own domain, keeps it only if the page matches the business's city or phone, honors robots.txt, and pulls a public email and phone. This is what fixes GoHighLevel being 1.1% email.

Google Maps is not scraped. Google's Maps Platform terms (section 3.2.3) forbid scraping and storing Maps content, and the Places API can't be stored in a CRM long term either. The BCS Chamber directory is not scraped; ask the chamber for the member list or use the printed directory.

## Brands

`config/brands.json` decides which leads each brand gets: Restore Marketing gets everything, Pax Scales and AI Cowboy get trades, Restore Ai gets medical, dental, legal and financial. A brand is pushed only when its GoHighLevel location id is set.

## Run it

```
npm test
node src/run.js --job college-station            # dry run, writes out/*.csv
node src/run.js --job houston --enrich --push    # writes to GoHighLevel
```

Writes use GoHighLevel's `/contacts/upsert`, so reruns update instead of duplicating. Leads with no phone and no email are never pushed.

## Where it runs

It lives in the `ghl-integration` repo next to Ron and the Recruiter, and runs on GitHub Actions (`.github/workflows/lead-engine.yml`) every morning at 6:15 AM Central. It reuses the repo's existing `GHL_API_TOKEN` and `GHL_LOCATION_ID` secrets, so no new keys or accounts.

It is a dry run until the repo variable `PUSH_TO_GHL` is set to `true`. Because this repo is public, the log shows counts only, never lead rows.

Cost: $0. Public repos get free Actions minutes, the state data is free, no Apify.
