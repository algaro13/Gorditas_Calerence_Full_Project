# Ajustes del alta y manual de ayuda

## Por qué

Al dar de alta un restaurante desde un teléfono, el indicador de pasos y la fila para agregar
platillos se salían de la tarjeta: seis círculos con conectores de ancho fijo necesitan unos 352 px
y en un iPhone quedan unos 294, y el campo del nombre no podía encogerse por debajo de su texto de
ejemplo. Los ejemplos de «Cargar ejemplos de gorditas» no eran los que quiere el dueño del producto.

Los correos del sistema (verificación, invitaciones) llegan a «no deseado» en Outlook y Hotmail
mientras el dominio nuevo gana reputación; el usuario necesita saber que debe buscarlos ahí.

Y el administrador no tenía dónde aprender a usar el sistema sin preguntar.

## Qué cambia

- **Alta en el teléfono**: el indicador de pasos se reparte el ancho disponible y la fila de
  platillos y la de guisos se encogen sin salirse; la tarjeta usa menos margen en pantallas angostas.
- **Ejemplos del catálogo rápido**: Gordita de harina, Gordita de maíz, Quesadilla, Taco y Burrito.
- **Aviso de «Spam»**: la pantalla final del alta, la de verificar el correo y la de personal dicen
  que el correo puede llegar a «Spam» o «Correo no deseado».
- **Ayuda** (`/ayuda`, menú del administrador): un manual sencillo con índice y una sección por
  tarea —tomar una orden, cocina, cobrar, catálogos, personal, inventario, promociones, reportes,
  configuración, suscripción y preguntas frecuentes—, con pasos numerados y capturas de pantalla
  que marcan dónde pulsar. Las capturas las genera un script de Playwright contra el restaurante de
  demostración local, para poder rehacerlas cuando cambie una pantalla.
