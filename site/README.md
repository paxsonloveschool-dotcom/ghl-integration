# H&P Landscaping — marketing site

A self-contained, responsive landing site for **H&P Landscaping**: hero, services,
social proof, work gallery, and a lead-capture quote form. No build step, no
dependencies — open `index.html` and it runs.

```
site/
├── index.html      # full single-page site
├── css/style.css   # responsive styles (mobile-first breakpoints)
├── js/main.js      # mobile nav + quote-form submission
└── assets/         # drop real images/logos here
```

## Run locally

```bash
cd site
python3 -m http.server 8080
# open http://localhost:8080
```

## Lead capture → GoHighLevel

The quote form runs in **demo mode** until you point it at a real endpoint.
Set the inbound webhook on the form element in `index.html`:

```html
<form class="quote-form" id="quote-form" data-endpoint="https://YOUR-GHL-INBOUND-WEBHOOK">
```

It POSTs JSON: `name`, `email`, `phone`, `service`, `message`, `source`,
`submitted_at` — which lines up with the contact fields the agent's
`ghl_create_contact` tool already uses (see `agent/ghl.py`).

## About the Webflow export

This site was built directly in the repo because the original
`hp-landscaping-*.webflow.zip` export (~624 MB, almost entirely media) could not
be transferred into the build environment — the network egress policy blocks
Google Drive's download hosts, and the file is far too large for the Drive MCP
tool's inline transfer path.

To swap in the real export later, get the bytes into the environment via **one**
of these, then unzip it over this folder (and track large media with Git LFS):

1. **Allowlist egress** — add `drive.google.com` and `drive.usercontent.google.com`
   to the environment's network settings, start a fresh session, and download:
   `curl -L "https://drive.usercontent.google.com/download?id=<FILE_ID>&export=download&confirm=t" -o site.zip`
2. **Google API key** — the file is public, and the API host `www.googleapis.com`
   is already reachable, so a Drive-enabled API key is enough:
   `curl -L "https://www.googleapis.com/drive/v3/files/<FILE_ID>?alt=media&key=<API_KEY>" -o site.zip`

Heavy media (>100 MB files, or large `images/` and `videos/` folders) should be
tracked with [Git LFS](https://git-lfs.com) rather than committed directly.
