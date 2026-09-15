## 1. Documentar

- [x] 1.1 Escribir el requisito que liga plan y tope en `stripe-billing`

## 2. Probar

- [x] 2.1 Cada plan impone el tope de `PLAN_LIMITS`, incluido `empresarial`
- [x] 2.2 Subir de plan desbloquea un alta que antes fallaba

## 3. Verificación

- [x] 3.1 `npx tsc --noEmit` sin errores
- [x] 3.2 Suite completa en verde (102 pruebas, 19 archivos)
