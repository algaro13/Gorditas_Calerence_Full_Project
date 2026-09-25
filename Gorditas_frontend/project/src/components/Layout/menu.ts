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

export const MENU: MenuItem[] = [
  { id: 'dashboard', label: 'Panel Principal', icon: 'Home', path: '/', roles: ['Admin', 'Encargado'] },
  { id: 'nueva-orden', label: 'Nueva Orden', icon: 'PlusCircle', path: '/nueva-orden', roles: ['Admin', 'Encargado', 'Mesero'] },
  { id: 'editar-orden', label: 'Editar Orden', icon: 'Edit3', path: '/editar-orden', roles: ['Admin', 'Encargado', 'Mesero'] },
  { id: 'surtir-orden', label: 'Surtir Orden', icon: 'ChefHat', path: '/surtir-orden', roles: ['Admin', 'Encargado', 'Despachador', 'Cocinero'] },
  { id: 'despachar', label: 'Despachar', icon: 'Truck', path: '/despachar', roles: ['Mesero'] },
  { id: 'recibir-productos', label: 'Recibir Productos', icon: 'Package', path: '/recibir-productos', roles: ['Admin', 'Encargado'] },
  { id: 'cobrar', label: 'Cobrar', icon: 'CreditCard', path: '/cobrar', roles: ['Admin', 'Encargado', 'Mesero'] },
  { id: 'catalogos', label: 'Catálogos', icon: 'BookOpen', path: '/catalogos', roles: ['Admin'] },
  { id: 'reportes', label: 'Reportes', icon: 'BarChart3', path: '/reportes', roles: ['Admin'] },
  { id: 'configuracion', label: 'Configuración', icon: 'Settings', path: '/configuracion', roles: ['Admin', 'Encargado'] },
];
