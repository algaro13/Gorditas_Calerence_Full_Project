## Context

El sistema actual es un monolito single-tenant (Express + React + MongoDB) que corre en Docker. La autenticación usa JWT firmados manualmente con bcrypt para passwords. Se quiere convertir en SaaS multi-tenant bajo el dominio `kustodela.com` con subdominios `pos-{nombre}.kustodela.com` por cliente.

Recursos disponibles:
- Microsoft Entra External ID: tenant `calerence.onmicrosoft.com` (ID: `f126e948-b284-4332-ade2-6cffc98a879d`)
- Dominio `kustodela.com` en Cloudflare con wildcard DNS
- VPS existente
- Subdominios ocupados que NO se tocan: `app`, `appback`, `calerence`, `calerenceapi`

## Goals / Non-Goals

**Goals:**
- Login/registro/reset password delegado a Microsoft Entra External ID
- Cada tenant tiene su propia base de datos MongoDB (aislamiento total)
- Resolución automática de tenant por subdominio (sin configuración manual por cliente)
- Registro self-service: un restaurante se registra y su subdominio funciona inmediatamente
- Migrar datos existentes de "Gorditas Calerence" como primer tenant
- API centralizada en `posapi.kustodela.com`

**Non-Goals:**
- No se implementa Stripe/billing en esta fase
- No se implementa el onboarding wizard completo (imagen, paleta, catálogo) — solo registro básico
- No se implementa multisucursal internamente (es fase posterior)
- No se tocan los subdominios existentes (`app`, `appback`, `calerence`, `calerenceapi`)
- No se migra a otro framework

## Decisions

### 1. Microsoft Entra External ID con MSAL React

**Frontend:** Usa `@azure/msal-react` para el flujo de autenticación.
- El usuario hace login/registro directamente contra Microsoft Entra
- Entra maneja: UI de login, verificación de email, reset password, MFA (si se habilita)
- El frontend recibe un token JWT firmado por Microsoft
- Ese token se envía en cada request al backend

**Backend:** Valida el token de Entra (no genera tokens propios).
- Usa la librería `jsonwebtoken` + JWKS de Microsoft para validar firma
- Extrae el `oid` (Object ID) del token como identificador único del usuario
- Busca el usuario en la Master DB para saber a qué tenant pertenece

**Rationale:** Delegar auth a Entra elimina: manejo de passwords, hashing, emails de recovery, gestión de sesiones. Microsoft se encarga de la seguridad.

### 2. Database-per-tenant con Master DB

```
MongoDB
├── kustodela_master              # Datos globales de la plataforma
│   ├── tenants                   # {slug, nombre, dbName, plan, createdAt, activo}
│   ├── tenant_users              # {entraOid, tenantId, role, sucursalId}
│   └── plans                     # {nombre, maxUsuarios, precio, features}
│
├── pos_gorditas_calerence        # DB del tenant "Gorditas Calerence"
│   ├── ordenes, subordenes, productos, platillos, etc.
│   └── (misma estructura actual)
│
├── pos_el_sazon                  # DB de otro tenant
│   └── ...
```

**Rationale:** Aislamiento completo por base de datos. Backup/restore por cliente. Si un cliente cancela, se elimina su DB. MongoDB maneja bien múltiples DBs en un cluster.

### 3. Resolución de tenant por subdominio

El middleware extrae el slug del subdominio:
```
pos-gorditas-calerence.kustodela.com → slug = "gorditas-calerence"
```

Busca en `kustodela_master.tenants` por slug → obtiene `dbName` → conecta a esa DB para el request.

**Request flow:**
```
1. Request llega a posapi.kustodela.com
2. Header "Origin" o "X-Tenant-Slug" contiene el subdominio del frontend
3. Middleware extrae slug → busca tenant en master → conecta DB
4. Controller/Service opera sobre la DB del tenant
5. Response
```

**Rationale:** El frontend siempre sabe su subdominio. Lo envía como header. La API centralizada resuelve qué DB usar.

### 4. Registro self-service de tenants

Flujo:
1. Usuario visita `pos.kustodela.com` → click "Registrar mi restaurante"
2. Login con Microsoft Entra (si no tiene cuenta, se crea automáticamente)
3. Formulario: nombre del negocio → se genera slug automático
4. Validar slug disponible → crear documento en `tenants` → crear DB vacía con estructura base
5. Asignar al usuario como Admin del tenant
6. Redirect a `pos-{slug}.kustodela.com`

**Rationale:** Zero-touch provisioning. No requiere intervención manual para dar de alta un cliente.

### 5. Nginx config para subdominios

```nginx
# Wildcard: cualquier pos-*.kustodela.com va al frontend
server {
    server_name ~^pos-(?<tenant>.+)\.kustodela\.com$;
    # Sirve el mismo build de React (SPA)
    # El frontend lee el subdominio para saber qué tenant es
}

# API centralizada
server {
    server_name posapi.kustodela.com;
    location / {
        proxy_pass http://localhost:5000;
    }
}

# Landing page
server {
    server_name pos.kustodela.com;
    # Sirve la landing page / registro
}
```

**Rationale:** Un solo build de React sirve a todos los tenants. La personalización (logo, colores) se carga dinámicamente según el tenant.

### 6. Migración del tenant existente

La DB actual `mi_tienda_gorditas` se renombra/copia a `pos_gorditas_calerence`. Se crea un registro en la master DB para este tenant con slug `gorditas-calerence`. Los usuarios existentes se vinculan a su cuenta de Microsoft Entra.

## Risks / Trade-offs

- **Dependencia de Microsoft Entra** → Si Entra tiene downtime, nadie puede hacer login. Mitigation: Entra tiene SLA 99.99%.
- **Latencia de validación de token** → Cada request valida un JWT de Microsoft. Mitigation: cachear las JWKS keys, validación es local (no llama a Microsoft por cada request).
- **Complejidad del middleware multi-tenant** → Cada request necesita resolver el tenant. Mitigation: cachear la resolución slug→DB por unos minutos.
- **Migración de usuarios existentes** → Los usuarios actuales (email/password) deben crear cuenta en Microsoft Entra. Mitigation: flujo de "vinculación" la primera vez.
