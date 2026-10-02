import type { MenuItem } from '../../types';

/**
 * Los destinos de la navegación, en un solo sitio.
 *
 * Los usan la barra lateral (escritorio) y la navegación inferior (teléfono). Con la lista
 * duplicada, añadir una pantalla se olvidaría en una de las dos y el fallo solo se vería en un
 * tamaño de pantalla.
 *
 * `roles` es lo que hace que la navegación inferior funcione sin esconder nada: la mayoría de
 * los roles tiene cuatro destinos o menos.
 */
export type EntradaMenu = MenuItem;

/**
 * Las tareas del servicio, en el orden en que ocurren: tomar la orden, editarla, prepararla o
 * despacharla, y cobrar. Son las que lleva la barra de abajo.
 *
 * Antes la barra llevaba los primeros cuatro del menú, y el primero era el Panel Principal —que
 * se mira una o dos veces por turno— mientras Cobrar, que cierra cada mesa, quedaba detrás de
 * «Más». Un sitio al alcance del pulgar vale lo que se pulsa durante el turno.
 *
 * Están «surtir» y «despachar» las dos porque son el mismo momento del servicio para roles
 * distintos: el encargado surte, el mesero despacha. Con una sola, el mesero perdería la suya.
 */
export const SERVICIO: string[] = ['nueva-orden', 'editar-orden', 'surtir-orden', 'despachar', 'cobrar'];

export const MENU: MenuItem[] = [
  { id: 'dashboard', label: 'Panel Principal', icon: 'Home', path: '/', roles: ['Admin', 'Encargado'] },
  { id: 'nueva-orden', label: 'Nueva Orden', icon: 'PlusCircle', path: '/nueva-orden', roles: ['Admin', 'Encargado', 'Mesero'] },
  { id: 'editar-orden', label: 'Editar Orden', icon: 'Edit3', path: '/editar-orden', roles: ['Admin', 'Encargado', 'Mesero'] },
  { id: 'surtir-orden', label: 'Surtir Orden', icon: 'ChefHat', path: '/surtir-orden', roles: ['Admin', 'Encargado', 'Despachador', 'Cocinero'] },
  { id: 'despachar', label: 'Despachar', icon: 'Truck', path: '/despachar', roles: ['Mesero'] },
  { id: 'recibir-productos', label: 'Recibir Productos', icon: 'Package', path: '/recibir-productos', roles: ['Admin', 'Encargado'] },
  { id: 'cobrar', label: 'Cobrar', icon: 'CreditCard', path: '/cobrar', roles: ['Admin', 'Encargado', 'Mesero'] },
  { id: 'promociones', label: 'Promociones', icon: 'Tag', path: '/promociones', roles: ['Admin'] },
  { id: 'catalogos', label: 'Catálogos', icon: 'BookOpen', path: '/catalogos', roles: ['Admin'] },
  { id: 'reportes', label: 'Reportes', icon: 'BarChart3', path: '/reportes', roles: ['Admin'] },
  { id: 'configuracion', label: 'Configuración', icon: 'Settings', path: '/configuracion', roles: ['Admin', 'Encargado'] },
  // Solo Admin: es quien puede pagar. El backend ya limita a Admin el checkout y el portal.
  { id: 'suscripcion', label: 'Suscripción', icon: 'Wallet', path: '/suscripcion', roles: ['Admin'] },
];
