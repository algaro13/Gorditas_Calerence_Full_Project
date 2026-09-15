## Why

El límite de usuarios por plan es lo que sostiene el cobro: si se puede rodear, el plan básico cuesta lo mismo que el empresarial. Al revisarlo aparecieron dos cosas.

**El límite se podía rodear.** Al registrarse, el dueño de cada restaurante recibía `ORG_OWNER` de su organización en Zitadel (`ZitadelIdentityProvider.ts`, verificado en producción). Con ese rol podía entrar a la consola de Zitadel, crear los usuarios que quisiera y usarlos en el POS sin pasar nunca por `/api/usuarios`, que es donde se comprueba el límite. El espejo de miembros (`member-mirror`) los daba de alta en su primera petición sin mirar cuántas plazas quedaban.

**Solo estaba probado un camino.** La suite cubría el alta, pero no la reactivación de alguien desactivado, que también comprueba el límite y por tanto podía romperse sin que nada avisara.

## What Changes

- El registro **retira la membresía `ORG_OWNER`** del dueño tras crear la organización. Zitadel se la asigna aunque se le pase `roles: []` —comprobado contra una instancia real—, así que no basta con omitirla. Si la retirada falla, el registro aborta y el llamador borra la organización: es preferible a dejar creado un restaurante capaz de emitir usuarios sin límite.
- Se cubre con pruebas el límite por sus tres caminos: alta, reactivación y espejo.
- Las cuatro organizaciones que ya existían en producción quedaron sin `ORG_OWNER`, conservando sus concesiones del proyecto.

## Capabilities

### Modified Capabilities
- `staff-management`: el requisito del límite se amplía para cubrir también la reactivación, no solo el alta.
- `tenant-onboarding`: el dueño deja de tener rol de administración sobre su organización de identidad.

## Impact

- **Backend**: `src/infrastructure/zitadel/ZitadelIdentityProvider.ts`.
- **Pruebas**: `test/e2e/limite-usuarios.test.ts` nuevo (3 casos). Suite de 97 a 100.
- **Producción**: membresías retiradas de las cuatro organizaciones de restaurante; la de plataforma no se tocó.
- **Sin cambios de esquema ni de contrato del API.**

## Fuera de alcance, a propósito

El límite sigue siendo una comprobación **al aprovisionar**, no un control en tiempo de ejecución: `onMemberSeen` no se espera en `tenantContext`, así que el espejo no puede rechazar una petición. Cerrar eso obligaría a esperar al espejo en la primera petición de cada usuario, metiendo al proveedor de identidad en el camino crítico. Se deja documentado con una prueba marcada `it.fails`, que se pondrá en rojo el día que se cierre.
