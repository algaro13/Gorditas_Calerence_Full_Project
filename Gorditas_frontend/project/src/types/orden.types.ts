import { BaseEntity } from './index';

export interface CreateOrdenDTO {
  idTipoOrden: number;
  nombreTipoOrden: string;
  idMesa?: number;
  nombreMesa?: string;
  nombreCliente?: string;
  notas?: string;
  estatus?: string;
}

export interface CreateSubordenDTO {
  nombre: string;
}

export interface AddProductoDTO {
  idProducto: number;
  nombreProducto: string;
  costoProducto: number;
  cantidad: number;
}

export interface AddPlatilloDTO {
  idPlatillo: number;
  nombrePlatillo: string;
  idGuiso: number;
  nombreGuiso: string;
  costoPlatillo: number;
  cantidad: number;
}

export interface AddExtraDTO {
  idExtra: number;
  nombreExtra: string;
  costoExtra: number;
  cantidad: number;
}

export interface OrdenListParams {
  estatus?: string;
  estatusNo?: string;
  mesa?: string;
  fecha?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items?: T[];
  ordenes?: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
