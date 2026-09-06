export interface ProductoStock {
  id: number;
  idTipoProducto: number;
  nombreTipoProducto: string;
  nombre: string;
  cantidad: number;
  costo: number;
  variantes: string[];
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventarioRepository {
  list(filter: { idTipoProducto?: number; activo?: boolean }, page: { skip: number; take: number }): Promise<{ rows: ProductoStock[]; total: number }>;
  listAll(filter: { activo?: boolean }): Promise<ProductoStock[]>;
  incrementar(idProducto: number, cantidad: number): Promise<ProductoStock | null>;
  setCantidad(idProducto: number, cantidad: number): Promise<ProductoStock | null>;
}
