# extract-site

Pull the front-end of a public web page — HTML, CSS, JS, images, fonts — and
auto-summarize its platform, color palette, and fonts. Built to capture a
reference page for a client rebuild.

## Why you run this locally (not in the Claude web container)

The Claude Code cloud environment's network egress is **allowlisted to GitHub
only**. The target site, web.archive.org, reader-proxies, and CDN hosts are all
blocked there (`x-deny-reason: host_not_allowed`), and the site's bot
protection 403s server-side fetchers. So the capture has to happen on a machine
with open internet — yours. (Same constraint that forced the `site/` rebuild;
see `../../site/README.md`.)

## Run

```bash
cd tools/extract-site

# Pull the CLIENT's own assets (photos + logo) for the build:
./extract.sh https://www.hplandscapingllc.com/

# Optional: capture the layout REFERENCE page (structure only, not its content):
./extract.sh https://www.kingswoodlandscape.com/services/custom-pools-outdoor-structures
```

For the H&P build, copy the real photos/logo out of
`extract-www.hplandscapingllc.com/site/` into `site/assets/` using the
filenames in `site/assets/README.md`.

Output lands in `extract-www.kingswoodlandscape.com/`:

```
extract-<host>/
├── site/        # mirrored page + all assets, links rewritten for offline
└── REPORT.md    # platform fingerprint, color palette, fonts, file count
```

Open `site/...index.html` in a browser to confirm the capture, and read
`REPORT.md` for the design tokens.

### If wget gets bot-walled (403 on assets)

Fall back to the browser:

1. Open the page → **Ctrl+S** → save as **"Webpage, Complete"**.
2. DevTools → **Network** tab → reload → right-click → **"Save all as HAR"**
   (gives the full list of every request/asset).
3. Run **Wappalyzer** (browser extension) to confirm the platform in one click.

## Hand it back to Claude

Commit the `extract-<host>/` folder to this repo (track any media >100 MB with
[Git LFS](https://git-lfs.com)), push, and ask Claude to convert it into:

- a clean **design-token spec** (colors, fonts, spacing scale),
- a **section-by-section template map**, and
- the **rebuild scaffold** — GoHighLevel page-builder config or static code in
  `site/`, with original placeholder copy.

## Legal / IP line

Front-end capture is fine for **reference**. In a client rebuild you may reuse
layout, section flow, spacing, palette, and font choices — but **not** the
source site's copy, photos, or logo. Replace all content with the client's own
assets and original copy (also avoids duplicate-content SEO penalties).
