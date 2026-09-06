import type { OrdenEstatus } from './OrdenStatus';

export interface OrdenCabecera {
  id: string;
  folio: string;
  idTipoOrden: number;
  nombreTipoOrden: string;
  estatus: OrdenEstatus;
  idMesa: number | null;
  nombreMesa: string | null;
  nombreCliente: string | null;
  fechaHora: Date;
  fechaPago: Date | null;
  total: number;
  notas: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Suborden {
  id: string;
  idOrden: string;
  nombre: string;
  createdAt: Date;
}

interface LineaBase {
  id: string;
  cantidad: number;
  importe: number;
  listo: boolean;
  entregado: boolean;
  createdAt: Date;
}

export interface LineaPlatillo extends LineaBase {
  idSuborden: string;
  idPlatillo: number;
  nombrePlatillo: string;
  idGuiso: number;
  nombreGuiso: string;
  costoPlatillo: number;
  notas: string | null;
}

export interface LineaProducto extends LineaBase {
  idOrden: string;
  idProducto: number;
  nombreProducto: string;
  costoProducto: number;
}

export interface LineaExtra extends LineaBase {
  idOrdenDetallePlatillo: string;
  idExtra: number;
  nombreExtra: string;
  costoExtra: number;
}

export interface OrdenConDetalles extends OrdenCabecera {
  subordenes: Suborden[];
  productos: LineaProducto[];
  platillos: Array<LineaPlatillo & { extras: LineaExtra[] }>;
  extras: LineaExtra[];
}

export interface CatalogoItem {
  id: number;
  nombre: string;
  activo: boolean;
  /** Precio de venta (platillo.precio, producto.costo, extra.costo). */
  precio: number;
}
