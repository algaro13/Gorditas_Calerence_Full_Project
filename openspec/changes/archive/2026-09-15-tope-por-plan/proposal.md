## Why

El tope de usuarios no es un número fijo: sale del plan contratado. Las pruebas comprobaban que al cambiar de plan se *guarda* el número correcto (`maxUsuarios: 10` para profesional, `3` para básico), pero ninguna comprobaba que ese número **se haga valer**. Son cosas distintas: el valor podía quedar bien guardado y la comprobación seguir usando otro, sin que nada avisara.

Además `empresarial` no aparecía en ninguna prueba de límite.

## What Changes

- Se añade la relación explícita entre plan y tope al spec de facturación, que hasta ahora solo decía que el estado devuelve `maxUsuarios`, sin fijar de dónde sale.
- Pruebas nuevas: cada plan impone el tope que declara `PLAN_LIMITS`, y subir de plan permite un alta que antes estaba bloqueada — el eslabón que faltaba.

## Capabilities

### Modified Capabilities
- `stripe-billing`: se fija que el tope de usuarios se deriva del plan.

## Impact

- **Pruebas**: `test/e2e/limite-usuarios.test.ts` pasa de 3 a 5 casos. Suite de 100 a 102.
- **Sin cambios de código de aplicación**: la relación ya existía, no estaba escrita ni comprobada.
