# Self-host the H&P Landscaping site (drop Webflow)

Serve the site yourself on your own domain with automatic HTTPS. No Webflow,
no GitHub Pages, no third-party host — just a tiny Caddy web server you control.

You need:
- A server with a **public IP** and ports **80 + 443** open (any cheap VPS —
  DigitalOcean, Hetzner, Linode, Vultr — or a home server/mini-PC with those
  ports forwarded), with **Docker** installed.
- Your **domain**, with DNS you can edit.

---

## 1. Point your domain at the server

In your domain's DNS, create records pointing to your server's IP:

| Type | Name  | Value (your server IP) |
|------|-------|------------------------|
| A    | `@`   | `203.0.113.10`         |
| A    | `www` | `203.0.113.10`         |

(Add matching `AAAA` records if your server has an IPv6 address.)

DNS can take a few minutes to a few hours to propagate. Caddy needs this
working before it can issue the HTTPS certificate.

## 2. Get the code on the server

```bash
git clone https://github.com/paxsonloveschool-dotcom/ghl-integration.git
cd ghl-integration/deploy/web
```

## 3. Configure your domain

```bash
cp .env.example .env
# edit .env and set SITE_DOMAIN=yourdomain.com   (apex, no www, no http://)
```

## 4. Launch

```bash
docker compose up -d
```

That's it. Caddy starts, automatically requests a free Let's Encrypt
certificate for `yourdomain.com` and `www.yourdomain.com`, and serves the site
over HTTPS. Visit **https://yourdomain.com**.

```bash
docker compose logs -f     # watch startup / cert issuance
docker compose ps          # status
```

The container has `restart: unless-stopped`, so it comes back automatically
after crashes or reboots — running 24/7 on your own infrastructure.

---

## Updating the site

The site is bind-mounted, so updates are instant — no rebuild:

```bash
cd ghl-integration && git pull
```

When you later get the real Webflow export in, unzip it into `site/` and
`git pull` on the server — same flow.

## Single-image alternative (no repo on the host)

If you'd rather ship one self-contained artifact:

```bash
# from the repo root
docker build -f deploy/web/Dockerfile -t hp-site .
docker run -d --restart unless-stopped -p 80:80 -p 443:443 \
    -e SITE_DOMAIN=yourdomain.com -v caddy_data:/data hp-site
```

## No-Docker alternative

Install Caddy natively (https://caddyserver.com/docs/install), put the contents
of `site/` in `/var/www/hp` and use this `/etc/caddy/Caddyfile`:

```
yourdomain.com, www.yourdomain.com {
    root * /var/www/hp
    encode gzip zstd
    file_server
    try_files {path} {path}/ /index.html
}
```

Then `sudo systemctl enable --now caddy`. Caddy runs as a managed service and
handles HTTPS the same way.

---

## Cancel Webflow

Once `https://yourdomain.com` loads correctly and DNS is fully pointed here,
your site no longer depends on Webflow — you can cancel the subscription.
