## Context

El backend usa MongoDB con Mongoose. Los schemas se definen en código (`src/models/`) pero no existe un mecanismo para aplicar cambios a documentos existentes cuando un schema evoluciona. Actualmente si se agrega un campo nuevo, los documentos viejos simplemente no lo tienen — no hay forma de saber qué versión del schema tiene cada documento ni de aplicar transformaciones de forma controlada.

El proyecto ya tiene un `appsettings.json` con la configuración de conexión a MongoDB que se puede reutilizar.

## Goals / Non-Goals

**Goals:**
- Tener un historial auditable de todos los cambios al schema de la base de datos
- Poder aplicar cambios de forma incremental y reproducible (up)
- Poder revertir cambios si algo sale mal (down)
- Integrar el flujo de migraciones con los scripts npm existentes
- Documentar el estado actual del schema como baseline
- Opcionalmente ejecutar migraciones pendientes al iniciar la app

**Non-Goals:**
- No se genera migraciones automáticamente desde los modelos (como EF) — se escriben manualmente
- No se migra a otra base de datos
- No se cambian los modelos Mongoose existentes en este cambio
- No se implementa un sistema de versionado de documentos individuales

## Decisions

### 1. migrate-mongo como herramienta

**Elegido**: `migrate-mongo`
**Alternativas consideradas**:
- `mongo-migrate-ts` — Soporte TypeScript nativo, pero menos maduro y comunidad más pequeña
- Scripts manuales — Sin estructura, sin tracking, sin rollback
- `mongoose-migrate` — Abandonado

**Rationale**: `migrate-mongo` es la herramienta más establecida (500k+ descargas/semana), tiene CLI simple, soporte para up/down, y tracking automático en una colección `changelog`. Es JavaScript puro pero funciona perfectamente en un proyecto TypeScript.

### 2. Configuración conectada a appsettings.json

El archivo `migrate-mongo-config.js` leerá la URI de MongoDB desde `appsettings.json` (con override de env vars), reutilizando la misma lógica de configuración que el resto de la app.

```javascript
// migrate-mongo-config.js
const settings = require('./appsettings.json');
const uri = process.env.MONGODB_URI || settings.database.uri;
```

**Rationale**: Una sola fuente de verdad para la conexión. No duplicar la URI en otro archivo de config.

### 3. Carpeta de migraciones en la raíz del backend

```
Gorditas_Calerence_Backend/
├── migrations/                    # Archivos de migración
│   └── 20260523-baseline.js       # Migración inicial
├── migrate-mongo-config.js        # Config de migrate-mongo
├── appsettings.json
└── src/
```

**Rationale**: Las migraciones son infraestructura de base de datos, no código de aplicación. Van fuera de `src/` para que no se compilen con TypeScript.

### 4. Convención de nombres

Formato: `YYYYMMDD-descripcion-kebab-case.js`

Ejemplos:
- `20260523-baseline.js`
- `20260601-agregar-telefono-a-usuarios.js`
- `20260615-renombrar-fechaHora-a-fechaCreacion.js`

**Rationale**: La fecha al inicio garantiza orden cronológico. La descripción en kebab-case es legible y consistente.

### 5. Ejecución automática al startup (configurable)

Se agrega una opción `database.runMigrationsOnStart` en `appsettings.json`. Si está en `true`, la app ejecuta migraciones pendientes antes de aceptar requests. Default: `false` (para producción se recomienda ejecutar manualmente antes del deploy).

**Rationale**: Útil para desarrollo local (no olvidar correr migraciones), pero peligroso en producción sin supervisión. Por eso es configurable y desactivado por defecto.

## Risks / Trade-offs

- **Migraciones manuales** → No se auto-generan como en EF. Mitigation: documentar claramente cuándo crear una migración y proveer ejemplos.
- **Migraciones en JavaScript (no TypeScript)** → `migrate-mongo` no soporta TS nativamente. Mitigation: las migraciones son scripts simples de MongoDB, no necesitan tipado complejo.
- **Ejecución en producción** → Una migración mal escrita puede corromper datos. Mitigation: siempre escribir `down()`, probar en staging primero, y hacer backup antes de ejecutar.
- **Colección changelog** → Agrega una colección extra a la DB. Mitigation: es una colección pequeña y es el estándar de la industria para tracking de migraciones.
