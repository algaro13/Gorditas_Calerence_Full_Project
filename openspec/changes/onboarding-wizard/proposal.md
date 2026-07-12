## Why

Cuando un nuevo restaurante se registra, necesita un flujo guiado paso a paso que lo lleve de la mano para configurar su negocio: elegir su nombre/subdominio, subir la imagen del negocio, seleccionar su paleta de colores, configurar sus mesas y agregar su catálogo inicial. Sin este flujo, el usuario llegaría a un dashboard vacío sin saber por dónde empezar.

## What Changes

- Crear flujo de onboarding de 5 pasos guiado (wizard)
- Paso 1: Datos del negocio (nombre, subdominio con preview `pos-{slug}.kustodela.com`)
- Paso 2: Imagen del negocio (upload a Cloudflare R2 o almacenamiento local)
- Paso 3: Paleta de colores (selección de tema que se aplica a toda la app)
- Paso 4: Configurar mesas (agregar cantidad y nombres de mesas)
- Paso 5: Catálogo rápido (agregar platillos, guisos y productos básicos)
- Al completar el wizard: crear tenant, provisionar DB, redirigir al sistema

## Capabilities

### New Capabilities
- `onboarding-flow`: Flujo de registro guiado paso a paso para nuevos restaurantes con validación y preview en cada paso
- `theme-customization`: Sistema de personalización visual (imagen de negocio + paleta de colores) que se aplica dinámicamente al tenant
- `image-upload`: Upload y almacenamiento de imágenes del negocio

### Modified Capabilities

## Impact

- **Frontend**: Nueva sección `/onboarding` con componente wizard multi-paso
- **Backend**: Endpoint para upload de imagen, actualización de config del tenant (paleta, logo)
- **CSS/Tailwind**: Sistema de CSS variables para paleta dinámica por tenant
- **Almacenamiento**: Carpeta local `uploads/` o integración con Cloudflare R2 para imágenes
- **Flujo de registro**: Después del login con Microsoft, si el usuario no tiene tenant, se redirige al onboarding
