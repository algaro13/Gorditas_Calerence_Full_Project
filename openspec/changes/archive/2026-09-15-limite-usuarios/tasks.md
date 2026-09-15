## 1. Cerrar el rodeo

- [x] 1.1 Comprobar contra una instancia real que Zitadel asigna `ORG_OWNER` aunque se pase `roles: []`
- [x] 1.2 Retirar la membresía en `createOrganizationWithAdmin`, abortando si falla
- [x] 1.3 Verificar que tras retirarla el dueño sigue pudiendo iniciar sesión
- [x] 1.4 Retirarla de las cuatro organizaciones que ya existían en producción

## 2. Pruebas

- [x] 2.1 `test/e2e/limite-usuarios.test.ts`: alta, reactivación y espejo
- [x] 2.2 Marcar el camino del espejo con `it.fails`, para que avise el día que se cierre

## 3. Verificación

- [x] 3.1 `npx tsc --noEmit` sin errores
- [x] 3.2 Suite completa en verde (100 pruebas, 19 archivos)
- [x] 3.3 Las 10 concesiones del proyecto siguen activas en producción (`projections.user_grants5`)
- [x] 3.4 La organización de plataforma conserva sus dos miembros
