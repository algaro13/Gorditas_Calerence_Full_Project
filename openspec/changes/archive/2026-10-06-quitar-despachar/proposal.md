# Quitar Despachar: de cocina directo a cobrar

## Por qué

Despachar solo seguía en el menú del mesero (los demás roles ya no lo veían desde las
«Correcciones del cliente» de octubre de 2025). Es un paso que sobra: Cobrar ya muestra y cobra las
órdenes surtidas, y el backend ya permite pasar de «Surtida» a «Pagada». El dueño del producto pide
quitarlo y que la Ayuda muestre el flujo de una orden en un diagrama sencillo.

## Qué cambia

- **Despachar desaparece**: sale del menú del mesero y de la barra inferior, se quita su ruta y su
  pantalla. El flujo queda en tres pasos: Nueva orden → Surtir orden → Cobrar.
- **Textos**: las descripciones de los roles en Catálogos, la función del plan Básico, la página de
  inicio y el aviso de «solo productos» en Nueva orden ya no mencionan el despacho.
- **Ayuda**: una sección nueva, «El flujo de una orden», con un diagrama de tres pasos (quién hace
  cada uno) y la indicación de que «Editar orden» sirve mientras no se cobre. Cocina y Cobrar dicen
  que la orden surtida pasa directo a Cobrar.
- **Pruebas**: el ciclo de una orden va de surtir a cobrar sin despachar.
