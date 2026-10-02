## 1. Correcciones

- [x] 1.1 Fin de prueba como «hoy», «mañana» o fecha con días
- [x] 1.2 «1 día restante» en el aviso del panel
- [x] 1.3 «Prueba vencida» en `/planes` y `/suscripcion`
- [x] 1.4 `/planes` en pausa: «Cerrar sesión» para todos; aviso al no-Admin
- [x] 1.5 Pago pendiente manda sobre la cancelación programada en la pastilla
- [x] 1.6 En prueba con cupo lleno: «elige un plan con más usuarios»
- [x] 1.7 Pruebas de navegador para 1.1, 1.3, 1.4 y 1.5 (1.4 del lado del Admin: el rol sale del
  token y no se puede intervenir; el Mesero se probó a mano)

## 2. Verificación

- [x] 2.1 Recorrer de nuevo los estados en el navegador, con Admin y con Mesero. El aviso del
  panel para Encargado («avisa al administrador», sin enlace) no se recorrió: no hay Encargado de
  pruebas
- [x] 2.2 Suites del backend y de navegador en verde

## 3. Cierre

- [x] 3.1 Commit y `openspec archive`
