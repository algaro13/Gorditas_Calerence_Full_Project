## Why

Actualmente no existe un mecanismo formal para controlar cambios en la estructura de la base de datos MongoDB. Cuando se agrega un campo, se renombra o se cambia un tipo de dato, no hay trazabilidad de qué cambió, cuándo, ni forma de revertirlo. Esto genera riesgo de inconsistencia de datos en producción y dificulta la colaboración entre desarrolladores.

Se necesita un sistema de migraciones que garantice la integridad de los datos y mantenga un historial auditable de todos los cambios al schema de la base de datos.

## What Changes

- Integrar `migrate-mongo` como herramienta de migraciones de base de datos
- Crear una configuración de migraciones que se conecte usando el `appsettings.json` existente
- Establecer una convención de nombres y estructura para archivos de migración
- Agregar scripts npm para ejecutar migraciones (`migrate:up`, `migrate:down`, `migrate:status`, `migrate:create`)
- Crear una migración inicial que documente el estado actual del schema como punto de partida (baseline)
- Integrar la ejecución de migraciones pendientes al proceso de startup de la aplicación (opcional, configurable)

## Capabilities

### New Capabilities
- `database-migrations`: Sistema de migraciones para controlar cambios al schema de MongoDB con trazabilidad, rollback y ejecución automatizada

### Modified Capabilities

## Impact

- **Dependencias**: Se agrega `migrate-mongo` como dependencia de desarrollo
- **Archivos nuevos**: `migrate-mongo-config.js`, carpeta `migrations/` con la migración baseline
- **Scripts npm**: Se agregan 4 scripts nuevos al `package.json`
- **Base de datos**: Se crea una colección `changelog` que registra las migraciones aplicadas
- **Startup**: Opcionalmente se ejecutan migraciones pendientes al iniciar la app
- **Flujo de desarrollo**: Los desarrolladores deben crear una migración cada vez que modifiquen el schema de un modelo
