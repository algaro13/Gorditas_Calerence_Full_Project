## 1. Instalación y configuración

- [x] 1.1 Instalar `migrate-mongo` como dependencia de desarrollo (`npm install migrate-mongo --save-dev`)
- [x] 1.2 Crear `migrate-mongo-config.js` en la raíz del backend que lea la URI desde `appsettings.json` con override de `MONGODB_URI`
- [x] 1.3 Crear carpeta `migrations/` en la raíz del backend
- [x] 1.4 Agregar `migrations/` al `include` o excluirlo del `tsconfig.json` (no debe compilarse)

## 2. Scripts npm

- [x] 2.1 Agregar script `migrate:up` en `package.json`: `"migrate-mongo up"`
- [x] 2.2 Agregar script `migrate:down` en `package.json`: `"migrate-mongo down"`
- [x] 2.3 Agregar script `migrate:status` en `package.json`: `"migrate-mongo status"`
- [x] 2.4 Agregar script `migrate:create` en `package.json`: `"migrate-mongo create"`

## 3. Migración baseline

- [x] 3.1 Crear migración baseline (`migrations/YYYYMMDD-baseline.js`) que documente el estado actual: crea los índices definidos en los modelos Mongoose (Orden, Producto, Usuario, etc.)
- [x] 3.2 Implementar la función `down()` del baseline que elimine los índices creados (para poder revertir en caso necesario)

## 4. Auto-migración al startup (opcional)

- [x] 4.1 Agregar campo `database.runMigrationsOnStart` a `appsettings.json` (default: `false`)
- [x] 4.2 Actualizar la interfaz `DatabaseConfig` en `src/interfaces/config.ts` para incluir `runMigrationsOnStart: boolean`
- [x] 4.3 Crear función `runPendingMigrations()` en `src/config/migrations.ts` que ejecute migraciones pendientes programáticamente usando la API de `migrate-mongo`
- [x] 4.4 Integrar `runPendingMigrations()` en `src/server.ts` — ejecutar después de `connectDB()` y antes de `app.listen()`, solo si `runMigrationsOnStart` es `true`
- [x] 4.5 Si la migración falla, loguear el error y terminar el proceso con `process.exit(1)`

## 5. Documentación y convenciones

- [x] 5.1 Agregar sección "Migraciones" al README del backend explicando: cuándo crear una migración, cómo nombrarla, cómo ejecutarla, y ejemplos comunes (agregar campo, renombrar, cambiar tipo)
- [x] 5.2 Crear archivo `migrations/README.md` con la convención de nombres y un template de migración de ejemplo

## 6. Verificación

- [x] 6.1 Verificar que `npm run migrate:status` se conecta correctamente y muestra el estado
- [x] 6.2 Verificar que `npm run migrate:up` aplica la migración baseline sin errores
- [x] 6.3 Verificar que `npm run migrate:down` revierte la migración baseline
- [x] 6.4 Verificar que el proyecto sigue compilando sin errores (`npm run build`)
