# Host the site on Cloudflare Pages (your domain, your account)

Your domain lives in Cloudflare, so **Cloudflare Pages** is the natural home:
free static hosting, automatic HTTPS, global CDN, and — because the domain is
already on Cloudflare — attaching it wires up DNS for you. No Webflow, no VPS.

There are two ways. Pick **one**.

---

## Option A — Connect in the Cloudflare dashboard (recommended, no secrets)

Fewest moving parts; Cloudflare auto-deploys on every push to `main`.

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
2. Authorize GitHub and select the **`ghl-integration`** repo.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `site`
4. **Save and Deploy.** You'll get a `*.pages.dev` URL — open it to confirm the
   site renders.
5. In the new Pages project → **Custom domains** → **Set up a domain** → enter
   your domain (and `www`). Since the domain is on Cloudflare, it adds the DNS
   records and provisions HTTPS automatically.

Done. Every push to `main` that touches `site/` redeploys automatically.

---

## Option B — Deploy from GitHub Actions (this repo's `cloudflare-pages.yml`)

Use this if you'd rather not connect Git in the dashboard. The workflow is
already in the repo but **disabled** until you opt in:

1. Create a **Cloudflare API token**: dashboard → My Profile → API Tokens →
   Create Token → use a token with **Account → Cloudflare Pages → Edit**.
2. Find your **Account ID**: dashboard → Workers & Pages (right-hand sidebar).
3. Repo → **Settings → Secrets and variables → Actions**:
   - Secret **`CLOUDFLARE_API_TOKEN`** = the token
   - Secret **`CLOUDFLARE_ACCOUNT_ID`** = your account id
   - Variable **`CF_PAGES_ENABLED`** = `true`
4. Push anything to `site/` (or run the workflow manually). It creates/updates a
   Pages project named **`hp-landscaping`** and deploys `site/`.
5. Attach your custom domain in the Pages project → **Custom domains** (same as
   Option A, step 5).

---

## Updating the site

- **Option A:** push to `main` → Cloudflare redeploys automatically.
- **Option B:** push to `main` (touching `site/`) → the workflow redeploys.

When the real Webflow export arrives, unzip it into `site/`, commit, push — it
deploys the same way.

## Cancel Webflow

Once your domain loads the site over HTTPS from Cloudflare Pages, nothing
depends on Webflow anymore — cancel the subscription.

---

### Note on the other deploy option in this repo
`deploy/web/` (Caddy on your own VPS/device) is an alternative for fully
self-managed hosting. Since your domain is on Cloudflare, **Cloudflare Pages
(above) is simpler and recommended** — you don't need a server at all.
