# Aviso de privacidad y términos del servicio

Se publican en `/privacidad` y `/terminos`. Se enlazan desde el pie de la página de venta, el inicio
de sesión y el registro, y el registro exige aceptarlos: el restaurante guarda la versión aceptada,
la fecha y el correo (`tenants.legal_version`, `legal_aceptado_at`, `legal_aceptado_por`).

## Antes de publicarlos de verdad

1. Completa los datos de ejemplo de `Gorditas_frontend/project/src/legal/datos.ts` (`DATOS_LEGALES`):
   responsable, RFC, domicilio, correos, proveedores de servidores, respaldos y correo, si los
   precios incluyen IVA, cómo se pide la factura (CFDI) de la suscripción, el límite de
   responsabilidad y la ciudad de los tribunales. Cuando ninguno quede entre corchetes, desaparece
   el aviso de borrador.
2. Que un abogado revise los textos (`src/pages/Privacidad.tsx` y `src/pages/Terminos.tsx`). Puntos
   a confirmar: la autoridad ante la que se reclama, los plazos de respuesta de los derechos ARCO y
   el papel de Kustodela como encargado de los datos que registra cada restaurante.

## Cuando cambie el sistema o el texto

Los textos describen lo que el sistema hace: la prueba de 14 días, los 15 días por encima del cupo,
los plazos de inactividad, los 30 días para recuperar y la rotación de respaldos de 12 meses
(`infra/respaldo`). Si cambia uno de esos valores en el código, cambia también el texto.

Cualquier cambio de contenido cambia `VERSION_LEGAL` (la fecha). Los restaurantes ya registrados
conservan la versión que aceptaron. Avisarles del cambio por correo, como dicen los propios
documentos, todavía es manual.
