Cada fase se sostiene sola y se puede desplegar sola. El orden importa: la primera es requisito
de las demás.

## 1. Congelar la orden pagada

- [ ] 1.1 Añadir, quitar o modificar líneas de una orden Pagada se rechaza
- [ ] 1.2 El total de una orden Pagada no se recalcula
- [ ] 1.3 Una prueba que lo afirme: hoy no falla nada si se hace

## 2. La línea de descuento

- [ ] 2.1 Tabla de descuentos por orden: importe negativo, origen, nombre copiado
- [ ] 2.2 `recalcularTotal` la suma — el único sitio donde se calcula el total
- [ ] 2.3 Descuento manual: rol Admin o Encargado, motivo obligatorio, quién y cuándo
- [ ] 2.4 La orden muestra sus descuentos como líneas, en la caja y en el detalle
- [ ] 2.5 El reporte del día muestra bruto, descuento y neto
- [ ] 2.6 Los descuentos manuales, aparte de los de promoción

## 3. El catálogo de promociones

- [ ] 3.1 Promoción por restaurante, con su forma y sus parámetros
- [ ] 3.2 Las tres formas cerradas: combo, NxM y porcentaje sobre categoría
- [ ] 3.3 Evaluación derivada: al cambiar las líneas, se reescriben sus descuentos
- [ ] 3.4 El descuento manual sobrevive al recálculo; el de promoción no
- [ ] 3.5 Sin acumular, salvo marca explícita: gana la que más favorece al cliente
- [ ] 3.6 Un combo se despliega en sus líneas reales, con su stock y su cocina

## 4. Ventanas de día y hora

- [ ] 4.1 Vigencia por fechas, días de la semana y franja horaria
- [ ] 4.2 Evaluadas en la zona del negocio, en el servidor

## 5. Verificación

- [ ] 5.1 Un combo con bebida descuenta el inventario de la bebida
- [ ] 5.2 La cocina ve los platillos del combo, no el nombre del combo
- [ ] 5.3 Quitar la línea que ganaba la promoción retira su descuento
- [ ] 5.4 Dos promociones aplicables dan siempre el mismo total
- [ ] 5.5 Una hora feliz de 16 a 18 no aplica a las 10 de la mañana
- [ ] 5.6 Una orden pagada no cambia de total pase lo que pase
- [ ] 5.7 Las dos suites en verde

## 6. Cierre

- [ ] 6.1 Commit y `openspec archive`
