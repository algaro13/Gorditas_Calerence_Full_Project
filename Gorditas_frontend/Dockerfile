# Imagen de construcción del SPA. No sirve nada: en producción Caddy sirve los archivos estáticos.
# El contenedor construye al arrancar, leyendo las variables VITE_* de su entorno
# (docker compose: env_file Gorditas_frontend/project/.env.production), y copia `dist` a /srv/pos.
FROM node:22-alpine
WORKDIR /app

COPY project/package*.json ./
RUN npm ci

COPY project/ ./

VOLUME ["/srv/pos"]
CMD ["sh", "-c", "npm run build && rm -rf /srv/pos/* && cp -r dist/. /srv/pos/ && echo 'frontend publicado en /srv/pos'"]
