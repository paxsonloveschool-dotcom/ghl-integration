# Fully self-contained website image — bundles Caddy + the site into one
# portable image you can ship to any device. Build from the REPO ROOT:
#
#   docker build -f deploy/web/Dockerfile -t hp-site .
#   docker run -d --restart unless-stopped -p 80:80 -p 443:443 \
#       -e SITE_DOMAIN=example.com -v caddy_data:/data hp-site
#
# Use this when you want a single artifact with no repo checkout on the host.
# (The docker-compose.yml setup is better if you want `git pull` to update the
# live site without rebuilding.)

FROM caddy:2-alpine

COPY deploy/web/Caddyfile /etc/caddy/Caddyfile
COPY site /srv
