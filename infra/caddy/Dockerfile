# Caddy con el módulo DNS de Cloudflare para el certificado wildcard (*.APP_DOMAIN) vía DNS-01.
ARG CADDY_VERSION=2.10
FROM caddy:${CADDY_VERSION}-builder AS builder
RUN xcaddy build --with github.com/caddy-dns/cloudflare

FROM caddy:${CADDY_VERSION}-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
