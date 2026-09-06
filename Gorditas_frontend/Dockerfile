# Construye el SPA y deja `dist` en /out. Caddy sirve los archivos estáticos en producción
# (ver infra/); esta imagen no ejecuta ningún servidor.
FROM node:22-alpine AS build
WORKDIR /app

COPY project/package*.json ./
RUN npm ci

COPY project/ ./
# Las variables VITE_* se inyectan en build (docker compose: build.args) y quedan en el bundle.
ARG VITE_APP_DOMAIN
ARG VITE_API_URL
ARG VITE_ZITADEL_AUTHORITY
ARG VITE_ZITADEL_CLIENT_ID
ARG VITE_ZITADEL_PROJECT_ID
ARG VITE_BRAND_NAME="Kustodela POS"
RUN npm run build

FROM alpine:3.20 AS dist
COPY --from=build /app/dist /out
# Copia el build al volumen montado en /srv/pos y termina.
CMD ["sh", "-c", "rm -rf /srv/pos/* && cp -r /out/. /srv/pos/ && echo 'frontend dist publicado'"]
