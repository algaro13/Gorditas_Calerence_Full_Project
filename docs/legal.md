# Aviso de privacidad y términos del servicio

Se publican en `/privacidad` y `/terminos`. Se enlazan desde el pie de la página de venta, el inicio
de sesión y el registro, y el registro exige aceptarlos: el restaurante guarda la versión aceptada,
la fecha y el correo (`tenants.legal_version`, `legal_aceptado_at`, `legal_aceptado_por`).

## Pendiente

1. Que un abogado revise los textos (`src/pages/Privacidad.tsx` y `src/pages/Terminos.tsx`). Puntos
   a confirmar: la autoridad ante la que se reclama, los plazos de respuesta de los derechos ARCO,
   el papel de Kustodela como encargado de los datos que registra cada restaurante y que los
   servidores y respaldos están fuera de México.
2. Factura (CFDI): por ahora se pide por correo a `contacto@kustodela.com` dentro del mes del cobro
   y se emite a mano; lo demás va a la factura global. Que el contador confirme el plazo y la
   periodicidad de la global. Cuando la facturación sea automática (Facturapi), cambia el texto de
   los términos y el de la pantalla de Suscripción.

Los datos del responsable están en `Gorditas_frontend/project/src/legal/datos.ts`
(`DATOS_LEGALES`). Un valor entre corchetes vuelve a mostrar las páginas como borrador.

## Cuando cambie el sistema o el texto

Los textos describen lo que el sistema hace: la prueba de 14 días, los 15 días por encima del cupo,
los plazos de inactividad, los 30 días para recuperar y la rotación de respaldos de 12 meses
(`infra/respaldo`). Si cambia uno de esos valores en el código, cambia también el texto.

Cualquier cambio de contenido cambia `VERSION_LEGAL` (la fecha). Los restaurantes ya registrados
conservan la versión que aceptaron. Avisarles del cambio por correo, como dicen los propios
documentos, todavía es manual.
