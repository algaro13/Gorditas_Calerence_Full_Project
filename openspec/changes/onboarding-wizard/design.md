## Context

El sistema ya tiene login con Microsoft Entra, multi-tenant con master DB, y Stripe billing. Falta el flujo que guía al usuario nuevo para configurar su restaurante antes de empezar a usar el POS. Actualmente si un usuario nuevo se registra, no tiene tenant asignado y el sistema no sabe qué hacer con él.

## Goals / Non-Goals

**Goals:**
- Flujo de 5 pasos claro e intuitivo que cualquier persona sin experiencia técnica pueda completar
- Upload de imagen del negocio (logo/foto del local)
- Selección de paleta de colores que se aplique a todo el sistema
- Configuración inicial de mesas
- Catálogo rápido para empezar a operar de inmediato
- Al completar: tenant creado, DB provisionada, usuario en su subdominio

**Non-Goals:**
- No se implementa catálogo avanzado (import de Excel, categorías complejas) — solo lo básico
- No se implementa multisucursal en el onboarding (es posterior)
- No se implementa personalización avanzada de UI (solo paleta)
- No se usa CDN/Cloudflare R2 por ahora — almacenamiento local es suficiente para empezar

## Decisions

### 1. Wizard multi-paso en el frontend

```
Paso 1: Datos del negocio
  → Nombre, slug (con preview en vivo)
  → Validación de disponibilidad en tiempo real

Paso 2: Imagen del negocio
  → Drag & drop o click para subir
  → Preview del logo/imagen
  → Formatos: jpg, png, webp (max 2MB)

Paso 3: Paleta de colores
  → 7 paletas predefinidas: Naranja, Rojo, Verde, Azul, Morado, Café, Oscuro
  → Preview en vivo del sidebar/header con el color elegido

Paso 4: Mesas
  → "¿Cuántas mesas tienes?" → slider o input numérico
  → Se crean automáticamente (Mesa 1, Mesa 2...)
  → Opción de agregar "Nuevo pedido" (para llevar)

Paso 5: Catálogo rápido
  → Agregar platillos (nombre + precio)
  → Agregar guisos (lista de nombres)
  → Skip opcional ("Lo haré después")
```

### 2. Almacenamiento de imágenes — Local con multer

Usamos `multer` para manejar uploads y guardar en una carpeta `uploads/` del backend. Nginx servirá los archivos estáticos.

```
Backend: POST /api/onboarding/upload-image
  → multer procesa el archivo
  → Guarda en uploads/{tenantSlug}/logo.{ext}
  → Retorna URL: /uploads/{tenantSlug}/logo.{ext}
```

**Rationale:** Simple, sin dependencias externas, suficiente para la etapa inicial. Se puede migrar a R2/S3 después si crece.

### 3. Paletas de colores con CSS variables

Cada paleta define variables CSS que se inyectan en el root:

```css
:root {
  --color-primary: #ea580c;       /* naranja */
  --color-primary-hover: #c2410c;
  --color-sidebar-bg: #111827;
  --color-sidebar-active: #ea580c;
}
```

El frontend lee la paleta del tenant (desde la config del tenant) y aplica las variables al montar la app.

**Paletas disponibles:**
- `orange` — Naranja (default, actual)
- `red` — Rojo
- `green` — Verde
- `blue` — Azul
- `purple` — Morado
- `brown` — Café/Madera
- `dark` — Oscuro/Negro

### 4. Detección de "usuario sin tenant"

El AuthContext detecta si el usuario de Entra no tiene un TenantUser en la master DB. Si no tiene → redirige automáticamente a `/onboarding`.

### 5. Flujo backend

```
POST /api/onboarding/complete
Body: { nombre, slug, paleta, mesas: [...], platillos: [...], guisos: [...] }

1. Validar slug disponible
2. Crear tenant en master DB (con config de paleta)
3. Provisionar database
4. Crear mesas iniciales en la DB del tenant
5. Crear platillos/guisos iniciales
6. Vincular usuario como Admin del tenant
7. Retornar URL del subdominio
```

## Risks / Trade-offs

- **Upload local** → Se pierde si migras el VPS sin copiar uploads/. Mitigation: incluir uploads/ en backups.
- **Paletas estáticas** → Solo 7 opciones. Mitigation: suficiente para el MVP. Se puede agregar custom color picker después.
- **Onboarding largo (5 pasos)** → Puede generar abandono. Mitigation: cada paso es rápido (< 30s), y paso 5 es skippable.
