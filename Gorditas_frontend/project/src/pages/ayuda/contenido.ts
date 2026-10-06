/**
 * El manual de Ayuda: una sección por tarea, con pasos cortos y la captura que marca dónde pulsar.
 *
 * Las capturas viven en `public/ayuda/` y las genera `e2e/manual.capturas.ts` contra el restaurante
 * de demostración local (ver docs/ayuda.md). Si cambia una pantalla, se vuelven a generar; si cambia
 * un botón de nombre, hay que cambiar también aquí el texto que lo menciona.
 */
export interface Paso {
  texto: string;
  /** Archivo en `public/ayuda/`, sin la carpeta. */
  imagen?: string;
  /** Qué muestra la captura, para quien no la ve y como pie de foto. */
  pie?: string;
}

export interface Seccion {
  id: string;
  titulo: string;
  /** Una línea: para qué sirve. */
  resumen: string;
  pasos: Paso[];
  /** Consejos al final de la sección. */
  consejos?: string[];
}

export const SECCIONES: Seccion[] = [
  {
    id: 'inicio',
    titulo: 'Conoce la pantalla',
    resumen: 'Dónde está cada cosa, en el teléfono y en la computadora.',
    pasos: [
      {
        texto:
          'Al entrar ves el Panel principal: las órdenes y las ventas del día, lo que falta por preparar y los productos con poco inventario.',
        imagen: 'inicio-panel.jpg',
        pie: 'El panel principal con los números del día.',
      },
      {
        texto:
          'En el teléfono, el menú está abajo: Nueva orden, Editar orden, Surtir orden y Cobrar. Todo lo demás está en «Más». En la computadora, el menú está a la izquierda.',
        imagen: 'inicio-menu.jpg',
        pie: 'El menú inferior; «Más» abre el resto de las opciones.',
      },
    ],
  },
  {
    id: 'orden',
    titulo: 'Tomar una orden',
    resumen: 'De la mesa a la cocina en cuatro toques.',
    pasos: [
      {
        texto: 'Pulsa «Nueva orden» y elige la mesa. Para llevar, elige «Nuevo pedido».',
        imagen: 'orden-1-mesa.jpg',
        pie: 'Elige la mesa o «Nuevo pedido».',
      },
      {
        texto: 'Escribe el nombre del cliente (opcional) y pulsa «Siguiente» (en el teléfono dice «Sig»).',
        imagen: 'orden-2-cliente.jpg',
        pie: 'Nombre del cliente y el botón para seguir.',
      },
      {
        texto: 'Pulsa «+ Platillo», elige el platillo, su guiso y, si quieres, los extras. Para bebidas y otros productos usa «+ Producto».',
        imagen: 'orden-3-platillo.jpg',
        pie: 'Agrega platillos y productos.',
      },
      {
        texto: 'Revisa el total y pulsa «Crear orden». La orden llega sola a la cocina.',
        imagen: 'orden-4-crear.jpg',
        pie: 'El total y el botón «Crear orden».',
      },
    ],
    consejos: [
      'Si el cliente ya pagó al pedir (por ejemplo, para llevar), marca «Mesa pagada» antes de crear la orden.',
      '¿Se te olvidó algo? Usa «Editar orden»; no hace falta crear otra.',
    ],
  },
  {
    id: 'cocina',
    titulo: 'Preparar en cocina',
    resumen: 'La cocina ve lo que hay que preparar y en qué orden.',
    pasos: [
      {
        texto:
          'Abre «Surtir orden». Cada mesa muestra sus órdenes y un color: verde (a tiempo), amarillo (más de 20 minutos) y rojo (más de 40).',
        imagen: 'cocina-surtir.jpg',
        pie: 'Las órdenes por preparar, con su color de prioridad.',
      },
      {
        texto: 'Cuando esté listo, pulsa «Surtir todas» en la mesa, o abre la mesa con la flecha para surtir una orden a la vez.',
      },
    ],
  },
  {
    id: 'entregar',
    titulo: 'Entregar en la mesa',
    resumen: 'El mesero lleva lo que ya salió de cocina.',
    pasos: [
      {
        texto:
          'Lo hace el mesero desde «Despachar», en su menú: ahí aparecen las mesas con órdenes listas. Pulsa «Entregar» cuando las lleves a la mesa.',
        imagen: 'entregar.jpg',
        pie: 'Las órdenes surtidas, listas para entregar.',
      },
    ],
  },
  {
    id: 'cobrar',
    titulo: 'Cobrar',
    resumen: 'Cierra la cuenta de la mesa.',
    pasos: [
      {
        texto: 'Abre «Cobrar». Cada mesa muestra su total. Puedes descargar la cuenta en PDF o imprimirla.',
        imagen: 'cobrar.jpg',
        pie: 'La mesa con su total y el botón «Cobrar».',
      },
      {
        texto: 'Pulsa «Cobrar» y confirma el monto en el aviso. Cobrar no se puede deshacer, por eso el sistema pregunta antes.',
      },
    ],
    consejos: ['La venta aparece al momento en el Panel principal y en Reportes.'],
  },
  {
    id: 'editar',
    titulo: 'Corregir una orden',
    resumen: 'Agrega o quita platillos de una orden que ya existe.',
    pasos: [
      {
        texto: 'Abre «Editar orden», elige la orden de la lista y agrega, quita o cambia lo que haga falta.',
        imagen: 'editar.jpg',
        pie: 'La lista de órdenes que todavía se pueden editar.',
      },
    ],
  },
  {
    id: 'catalogos',
    titulo: 'Platillos, guisos y mesas',
    resumen: 'Tu menú y tus mesas, en un solo lugar.',
    pasos: [
      {
        texto: 'Abre «Catálogos» y elige en el selector qué quieres ver: Platillos, Guisos, Productos, Extras, Mesas…',
        imagen: 'catalogos.jpg',
        pie: 'El selector de catálogos y el botón para agregar.',
      },
      {
        texto: 'Pulsa el botón «Nuevo…» para agregar, o «Editar» en una fila para cambiar su nombre o su precio.',
      },
    ],
  },
  {
    id: 'personal',
    titulo: 'Tu personal',
    resumen: 'Invita a tus meseros, cocineros y encargados.',
    pasos: [
      {
        texto: 'En «Catálogos», elige «Usuarios». Ahí ves cuántos usuarios tienes y cuántos permite tu plan.',
        imagen: 'personal.jpg',
        pie: 'La lista del personal y el botón «Invitar usuario».',
      },
      {
        texto:
          'Pulsa «Invitar usuario», escribe su nombre, su correo y su rol. Le llegará un correo para crear su contraseña; si no lo ve, que lo busque en Spam o Correo no deseado.',
      },
    ],
    consejos: [
      'Cada rol ve solo lo suyo: el mesero toma órdenes y cobra, la cocina prepara y el encargado supervisa.',
      'Si alguien deja de trabajar contigo, desactívalo: deja de entrar, pero su historial se conserva.',
    ],
  },
  {
    id: 'inventario',
    titulo: 'Inventario',
    resumen: 'Cuánto te queda de cada producto y qué recibiste.',
    pasos: [
      {
        texto: 'Abre «Recibir productos» para dar de alta productos (refrescos, agua…) y registrar lo que te llega.',
        imagen: 'inventario.jpg',
        pie: 'Los productos con su existencia y su precio.',
      },
      {
        texto: 'Cada venta descuenta del inventario. El Panel principal avisa cuando algo está por acabarse.',
      },
    ],
  },
  {
    id: 'promociones',
    titulo: 'Promociones',
    resumen: 'Combos y descuentos que se aplican solos.',
    pasos: [
      {
        texto: 'Abre «Promociones» y pulsa «Nueva promoción». Elige qué lleva el combo, su precio y los días en que aplica.',
        imagen: 'promociones.jpg',
        pie: 'La pantalla de promociones y el botón «Nueva promoción».',
      },
      {
        texto: 'No hay que hacer nada más: cuando una orden cumple la promoción, el descuento se aplica solo al cobrar.',
      },
    ],
  },
  {
    id: 'reportes',
    titulo: 'Reportes y caja',
    resumen: 'Cuánto vendiste, cuánto gastaste y cuánto ganaste.',
    pasos: [
      {
        texto: 'Abre «Reportes» y elige el periodo. Verás las ventas, los gastos y la utilidad de cada día.',
        imagen: 'reportes.jpg',
        pie: 'El resumen de ventas, caja, gastos y utilidad.',
      },
      {
        texto: 'Con «Agregar a caja» registras el efectivo inicial. Con «Exportar» descargas todo en Excel para tu contador.',
      },
    ],
  },
  {
    id: 'configuracion',
    titulo: 'Logo y colores',
    resumen: 'Que el sistema se vea como tu negocio.',
    pasos: [
      {
        texto: 'Abre «Configuración». Sube tu logo con «Cambiar imagen» (JPG, PNG o WebP, hasta 2 MB) y elige una paleta de colores.',
        imagen: 'configuracion.jpg',
        pie: 'La imagen del negocio y la paleta de colores.',
      },
      { texto: 'Pulsa «Guardar cambios». Todo tu personal lo verá la próxima vez que entre.' },
    ],
  },
  {
    id: 'suscripcion',
    titulo: 'Tu plan y tus pagos',
    resumen: 'Cambia de plan, actualiza tu tarjeta y pide factura.',
    pasos: [
      {
        texto:
          'Abre «Suscripción» para ver tu plan, cuándo se renueva y cuántos usuarios usas. «Cambiar de plan» te muestra los planes; «Administrar pago y recibos» abre el portal seguro de pagos.',
        imagen: 'suscripcion.jpg',
        pie: 'Tu plan actual y sus opciones.',
      },
      {
        texto: 'Si necesitas factura (CFDI), escribe al correo que aparece en esa pantalla dentro del mismo mes del cobro.',
      },
    ],
  },
];

export interface Pregunta {
  pregunta: string;
  respuesta: string;
}

export const PREGUNTAS: Pregunta[] = [
  {
    pregunta: 'No me llegó el correo (verificación, invitación o contraseña).',
    respuesta:
      'Búscalo en Spam o Correo no deseado; con Hotmail y Outlook es común al principio. Si lo encuentras ahí, márcalo como «No es spam» para que los siguientes lleguen bien.',
  },
  {
    pregunta: 'Olvidé mi contraseña.',
    respuesta:
      'En la pantalla para iniciar sesión, escribe tu correo, pulsa «Continuar» y luego «Restablecer contraseña». Te llegará un correo para crear una nueva.',
  },
  {
    pregunta: 'Pulso «Cobrar» y no pasa nada.',
    respuesta: 'El sistema pregunta antes de cobrar. Si tu navegador bloquea los avisos, permítelos para este sitio y vuelve a intentarlo.',
  },
  {
    pregunta: 'Quiero agregar más personal y no me deja.',
    respuesta: 'Tu plan tiene un límite de usuarios. Puedes desactivar a quien ya no trabaje contigo o cambiar a un plan con más usuarios en «Suscripción».',
  },
  {
    pregunta: '¿Mis datos están seguros?',
    respuesta: 'Cada restaurante solo ve sus propios datos. Hacemos respaldos cifrados todos los días. Puedes descargar tus reportes en Excel cuando quieras.',
  },
];
