import {
  IOrden,
  ISuborden,
  IOrdenDetalleProducto,
  IOrdenDetallePlatillo,
  IOrdenDetalleExtra,
  IProducto,
  IUser,
  IGasto
} from '../types';

// ─── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

// ─── Orden Repository ──────────────────────────────────────────────────────────

export interface IOrdenRepository {
  findById(id: string): Promise<IOrden | null>;
  find(filter: Record<string, any>, pagination: PaginationOptions): Promise<PaginatedResult<IOrden>>;
  create(data: Partial<IOrden>): Promise<IOrden>;
  updateById(id: string, data: Partial<IOrden>): Promise<IOrden | null>;
  deleteById(id: string): Promise<boolean>;
  countDocuments(filter: Record<string, any>): Promise<number>;
  aggregate(pipeline: any[]): Promise<any[]>;

  // Suborden
  findSubordenById(id: string): Promise<ISuborden | null>;
  findSubordenesByOrdenId(ordenId: string): Promise<ISuborden[]>;
  createSuborden(data: Partial<ISuborden>): Promise<ISuborden>;
  deleteSubordenesByOrdenId(ordenId: string): Promise<void>;

  // Detalle Producto
  findDetalleProductoById(id: string): Promise<IOrdenDetalleProducto | null>;
  findDetallesProductoByOrdenId(ordenId: string): Promise<IOrdenDetalleProducto[]>;
  createDetalleProducto(data: Partial<IOrdenDetalleProducto>): Promise<IOrdenDetalleProducto>;
  updateDetalleProductoById(id: string, data: Partial<IOrdenDetalleProducto>): Promise<IOrdenDetalleProducto | null>;
  deleteDetalleProductoById(id: string): Promise<boolean>;
  deleteDetallesProductoByOrdenId(ordenId: string): Promise<void>;
  updateManyDetallesProducto(filter: Record<string, any>, data: Record<string, any>): Promise<void>;
  aggregateDetallesProducto(pipeline: any[]): Promise<any[]>;

  // Detalle Platillo
  findDetallePlatilloById(id: string): Promise<IOrdenDetallePlatillo | null>;
  findDetallesPlatilloBySubordenIds(subordenIds: string[]): Promise<IOrdenDetallePlatillo[]>;
  createDetallePlatillo(data: Partial<IOrdenDetallePlatillo>): Promise<IOrdenDetallePlatillo>;
  updateDetallePlatilloById(id: string, data: Partial<IOrdenDetallePlatillo>): Promise<IOrdenDetallePlatillo | null>;
  deleteDetallePlatilloById(id: string): Promise<boolean>;
  deleteDetallesPlatilloBySubordenIds(subordenIds: string[]): Promise<void>;
  updateManyDetallesPlatillo(filter: Record<string, any>, data: Record<string, any>): Promise<void>;
  aggregateDetallesPlatillo(pipeline: any[]): Promise<any[]>;

  // Detalle Extra
  findDetalleExtraById(id: string): Promise<IOrdenDetalleExtra | null>;
  findDetallesExtraByPlatilloIds(platilloIds: string[]): Promise<IOrdenDetalleExtra[]>;
  createDetalleExtra(data: Partial<IOrdenDetalleExtra>): Promise<IOrdenDetalleExtra>;
  updateDetalleExtraById(id: string, data: Partial<IOrdenDetalleExtra>): Promise<IOrdenDetalleExtra | null>;
  deleteDetalleExtraById(id: string): Promise<boolean>;
  deleteDetallesExtraByPlatilloIds(platilloIds: string[]): Promise<void>;
  updateManyDetallesExtra(filter: Record<string, any>, data: Record<string, any>): Promise<void>;
  aggregateDetallesExtra(pipeline: any[]): Promise<any[]>;
}

// ─── Producto Repository ───────────────────────────────────────────────────────

export interface IProductoRepository {
  findById(id: string | number): Promise<IProducto | null>;
  find(filter: Record<string, any>, pagination: PaginationOptions): Promise<PaginatedResult<IProducto>>;
  findAll(filter: Record<string, any>): Promise<IProducto[]>;
  updateById(id: string | number, data: Partial<IProducto>): Promise<IProducto | null>;
  incrementQuantity(id: string | number, amount: number): Promise<IProducto | null>;
  countDocuments(filter: Record<string, any>): Promise<number>;
}

// ─── Usuario Repository ────────────────────────────────────────────────────────

export interface IUsuarioRepository {
  findById(id: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<any | null>; // Returns Mongoose doc with comparePassword
  create(data: Partial<IUser>): Promise<IUser>;
  findOne(filter: Record<string, any>): Promise<any | null>;
}

// ─── Catalogo Repository ───────────────────────────────────────────────────────

export interface ICatalogoRepository {
  find(modelo: string, filter: Record<string, any>, pagination: PaginationOptions): Promise<PaginatedResult<any>>;
  findById(modelo: string, id: string | number): Promise<any | null>;
  create(modelo: string, data: Record<string, any>): Promise<any>;
  updateById(modelo: string, id: string | number, data: Record<string, any>): Promise<any | null>;
  deleteById(modelo: string, id: string | number): Promise<boolean>;
}

// ─── Gasto Repository ──────────────────────────────────────────────────────────

export interface IGastoRepository {
  findById(id: string): Promise<IGasto | null>;
  find(filter: Record<string, any>): Promise<IGasto[]>;
  create(data: Partial<IGasto>): Promise<IGasto>;
  deleteById(id: string): Promise<boolean>;
  aggregate(pipeline: any[]): Promise<any[]>;
}
