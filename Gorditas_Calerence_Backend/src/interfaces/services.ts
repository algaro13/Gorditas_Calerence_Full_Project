import { PaginationOptions } from './repositories';

// ─── Auth Service ──────────────────────────────────────────────────────────────

export interface LoginResult {
  token: string;
  user: Record<string, any>;
}

export interface IAuthService {
  login(email: string, password: string): Promise<LoginResult>;
  getProfile(userId: string): Promise<Record<string, any>>;
}

// ─── Ordenes Service ───────────────────────────────────────────────────────────

export interface IOrdenesService {
  listOrdenes(filter: Record<string, any>, pagination: PaginationOptions): Promise<any>;
  getOrdenById(id: string): Promise<any>;
  createOrden(data: Record<string, any>): Promise<any>;
  createSuborden(ordenId: string, nombre: string): Promise<any>;
  addProducto(ordenId: string, data: Record<string, any>): Promise<any>;
  addPlatillo(subordenId: string, data: Record<string, any>): Promise<any>;
  addExtra(platilloDetalleId: string, data: Record<string, any>): Promise<any>;
  changeEstatus(ordenId: string, estatus: string, userRole: string): Promise<any>;
  updateFechaHora(ordenId: string, fechaHora?: string): Promise<any>;
  verificarOrden(ordenId: string, isComplete: boolean): Promise<any>;
  markProductoListo(id: string): Promise<void>;
  markPlatilloListo(id: string): Promise<void>;
  markExtraListo(id: string): Promise<void>;
  markProductoEntregado(id: string): Promise<void>;
  markPlatilloEntregado(id: string): Promise<void>;
  markExtraEntregado(id: string): Promise<void>;
  updateExtraEstatus(id: string, estatus: string): Promise<any>;
  updatePlatilloNota(id: string, notas: string): Promise<void>;
  deletePlatillo(id: string): Promise<void>;
  deleteProducto(id: string): Promise<void>;
  deleteExtra(id: string): Promise<void>;
  deleteOrden(id: string): Promise<void>;
}

// ─── Inventario Service ────────────────────────────────────────────────────────

export interface IInventarioService {
  getInventario(filter: Record<string, any>, pagination: PaginationOptions): Promise<any>;
  recibirProductos(productos: Array<{ idProducto: string; cantidad: number }>): Promise<any>;
  ajustarInventario(id: string, cantidad: number, motivo?: string): Promise<any>;
}

// ─── Reportes Service ──────────────────────────────────────────────────────────

export interface IReportesService {
  getReporteVentas(fechaInicio?: string, fechaFin?: string): Promise<any>;
  getReporteInventario(): Promise<any>;
  getReporteGastos(fechaInicio?: string, fechaFin?: string, tipoGasto?: string): Promise<any>;
  createGasto(data: Record<string, any>): Promise<any>;
  deleteGasto(id: string): Promise<any>;
  getProductosVendidos(fechaInicio?: string, fechaFin?: string, limit?: number): Promise<any>;
}

// ─── Catalogos Service ─────────────────────────────────────────────────────────

export interface ICatalogosService {
  list(modelo: string, filter: Record<string, any>, pagination: PaginationOptions): Promise<any>;
  create(modelo: string, data: Record<string, any>): Promise<any>;
  update(modelo: string, id: string | number, data: Record<string, any>): Promise<any>;
  delete(modelo: string, id: string | number): Promise<any>;
  getNextPedidoNumber(): Promise<number>;
}
