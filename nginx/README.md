# Configuración Nginx para Kustodela POS

## Subdominios

| Subdominio | Archivo | Propósito |
|------------|---------|-----------|
| `posapi.kustodela.com` | `posapi.kustodela.com.conf` | API centralizada → proxy a Express:5000 |
| `pos-*.kustodela.com` | `pos-wildcard.kustodela.com.conf` | Frontend de cada tenant (SPA) |
| `pos.kustodela.com` | `pos.kustodela.com.conf` | Landing page / registro |

## Instalación en el VPS

```bash
# Copiar configs a nginx
sudo cp *.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/posapi.kustodela.com.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/pos-wildcard.kustodela.com.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/pos.kustodela.com.conf /etc/nginx/sites-enabled/

# Probar configuración
sudo nginx -t

# Recargar
sudo systemctl reload nginx
```

## SSL con Cloudflare

Como el dominio está en Cloudflare con proxy activado (naranja), SSL se maneja automáticamente por Cloudflare. Nginx solo necesita escuchar en puerto 80.

Si prefieres SSL end-to-end, configura certificados de origen de Cloudflare.

## Configuración de Cloudflare

En el DNS de `kustodela.com` en Cloudflare:

| Tipo | Nombre | Contenido | Proxy |
|------|--------|-----------|-------|
| A | `pos` | IP del VPS | ✅ Proxied |
| A | `posapi` | IP del VPS | ✅ Proxied |
| A | `*` | IP del VPS | ⚠️ DNS only (wildcard no soporta proxy en plan free) |

**Nota:** Cloudflare free no proxea wildcards. Opciones:
1. Crear registros A individuales por tenant (`pos-gorditas-calerence`, `pos-elsazon`, etc.)
2. Usar Cloudflare Pro ($20/mes) que sí soporta wildcard proxy
3. Usar DNS only para el wildcard y manejar SSL con Let's Encrypt en el VPS
