# Aviso de privacidad y términos del servicio

## Por qué

El sistema recaba datos personales (nombre y correo del administrador y del personal, accesos) y
desde la fase 2 de la consola archiva y borra cuentas sin uso. No había aviso de privacidad ni
términos: el inicio de sesión decía «aceptas los términos y condiciones» sin enlazar a nada, y el
registro no pedía aceptar nada. La ley mexicana de datos personales (LFPDPPP, 2025) obliga a poner
el aviso a disposición antes de recabar los datos, y las reglas de archivado y borrado deben estar
aceptadas por escrito.

## Qué cambia

- **Dos páginas públicas**, `/privacidad` y `/terminos`, redactadas a partir de lo que el sistema
  hace de verdad: qué datos guarda y para qué, quién los procesa (Stripe, hospedaje, correo), los
  derechos ARCO, la prueba de 14 días, los planes con prorrateo, el plazo de 15 días al quedar por
  encima del cupo, los plazos de inactividad, los 30 días para recuperar, el borrado y la rotación
  de respaldos (hasta 12 meses). Llevan versión (fecha) y, mientras tengan datos de ejemplo entre
  corchetes, un aviso de borrador.
- **Enlaces** en el pie de la página de venta, en el inicio de sesión y en el registro.
- **Aceptación en el registro**: una casilla obligatoria en el paso de la cuenta. El backend rechaza
  el registro sin ella y guarda en el restaurante qué versión se aceptó, cuándo y con qué correo
  (migración `0011_aceptacion_legal`).

## Fuera de alcance

- El texto definitivo: lo revisa un abogado; los datos del responsable son de ejemplo.
- Volver a pedir la aceptación a los restaurantes existentes cuando cambie la versión.
