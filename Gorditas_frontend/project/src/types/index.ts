// Base interfaces
export interface BaseEntity {
  _id?: string;
  activo: boolean;
  fechaCreacion?: Date;
  fechaActualizacion?: Date;
}

// Catalog models
export interface Guiso extends BaseEntity {
  nombre: string;
  descripcion?: string;
}

export interface TipoProducto extends BaseEntity {
  nombre: string;
  descripcion?: string;
}

export interface Producto extends BaseEntity {
  nombre: string;
  codigoBarras?: string;
  tipoProducto: string;
  cantidad: number;
  costo: number;
  precio: number;
  variantes?: string[];
}

export interface TipoPlatillo extends BaseEntity {
  nombre: string;
  descripcion?: string;
}

export interface Platillo extends BaseEntity {
  nombre: string;
  idTipoPlatillo: number;
  nombreTipoPlatillo: string;
  precio: number; // This will be mapped from costo in the backend
  costo?: number; // Keep both for compatibility
  descripcion?: string;
}

export interface TipoUsuario extends BaseEntity {
  nombre: string;
  permisos: string[];
}

/** Estado del cupo del restaurante: cuantas plazas sobran, hasta cuando, y a quien le tocaria. */
export interface EstadoDeCupo {
  maxUsuarios: number;
  excedido: boolean;
  sobran: number;
  fechaLimite: string | null;
  plazoEnMarcha: boolean;
  enRiesgo: Usuario[];
  /** A quien ya desactivo el sistema al vencer un plazo, de lo mas reciente a lo mas antiguo. */
  desactivadosPorCupo: Usuario[];
}

/** Miembro del personal (espejo de Zitadel en `tenant_users`). */
export interface Usuario extends BaseEntity {
  _id: string;
  nombre: string;
  email: string;
  role: UserRole;
  nombreTipoUsuario: UserRole;
  lastSeenAt?: string | null;
  /** Cuando lo desactivo el sistema al vencer el plazo de cupo; null si fue a mano. */
  desactivadoPorCupo?: string | null;
  createdAt?: string;
}

export interface TipoOrden extends BaseEntity {
  nombre: string;
  descripcion?: string;
}

export interface Mesa extends BaseEntity {
  nombre: string;
  numero?: number;
  capacidad?: number;
  ubicacion?: string;
}

export interface TipoGasto extends BaseEntity {
  nombre: string;
  descripcion?: string;
}

// Transactional models
export interface Orden extends BaseEntity {
  idMesa: number;
  mesa: string;
  tipoOrden?: string;
  usuario?: string;
  estatus: 'Pendiente' | 'Recepcion' | 'Preparacion' | 'Surtida' | 'Entregada' | 'Pagada' | 'Cancelado';
  total: number;
  fecha?: Date;
  fechaHora?: Date;
  subordenes?: string[];
  nombreMesa?: string;
  nombreCliente?: string;
  folio?: string;
  notas?: string;
}

export interface OrdenCompleta extends Orden {
  productos?: OrdenDetalleProducto[];
  platillos?: OrdenDetallePlatillo[];
  extras?: any[];
}

export interface Suborden extends BaseEntity {
  nombre: string;
  orden: string;
  platillos?: OrdenDetallePlatillo[];
}

export interface OrdenDetallePlatillo extends BaseEntity {
  suborden?: string;
  platillo?: string;
  guiso?: string;
  cantidad: number;
  precio?: number;
  subtotal?: number;
  importe?: number;
  listo?: boolean;
  entregado?: boolean;
  nombrePlatillo?: string;
  idPlatillo?: number;
  nombreGuiso?: string;
  notas?: string; // Notas específicas del platillo
  extras?: OrdenDetalleExtra[]; // Extras vinculados a este platillo
}

export interface OrdenDetalleProducto extends BaseEntity {
  importe?: number;
  nombre?: string;
  orden?: string;
  producto?: string;
  cantidad: number;
  precio?: number;
  subtotal?: number;
  listo?: boolean;
  entregado?: boolean;
  nombreProducto?: string;
  idProducto?: number;
}

export interface Gasto extends BaseEntity {
  nombre: string;
  tipoGasto: string;
  usuario?: string;
  gastoTotal: number;
  descripcion?: string;
  fecha: Date;
}

// API response types
export interface ApiResponse<T> {
  items?: T[];
  [key: string]: any;
}

// Auth types
export interface AuthUser {
  _id: string;
  nombre: string;
  email: string;
  idTipoUsuario: number;
  /** Rol principal (compatibilidad con las pantallas existentes). */
  nombreTipoUsuario: UserRole;
  roles: UserRole[];
  activo: boolean;
}

export type PlanId = 'trial' | 'basico' | 'profesional' | 'empresarial';
export type PlanStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'expired';

export interface TenantConfig {
  paleta?: string;
  imagen?: string | null;
}

export interface TenantInfo {
  id: string;
  slug: string;
  nombre: string;
  plan: PlanId;
  planStatus: PlanStatus;
  trialEndsAt: string | null;
  maxUsuarios: number;
  activo: boolean;
  config: TenantConfig;
  url: string;
}

/** Datos públicos de un restaurante (antes del login). */
export interface TenantPublicInfo {
  slug: string;
  nombre: string;
  orgId: string | null;
  config: TenantConfig;
  url: string;
}

// Report types
export interface ReporteVentas {
  fecha: string;
  ventasTotales: number;
  gastosTotales: number;
  utilidad: number;
  ordenes: number;
}

export interface ReporteInventario {
  producto: Producto;
  valorTotal: number;
  stockMinimo: boolean;
}

export interface ProductoVendido {
  producto: string;
  nombre: string;
  cantidadVendida: number;
  totalVendido: number;
}

// UI types
export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  roles: string[];
}

export type UserRole = 'Admin' | 'Encargado' | 'Mesero' | 'Despachador' | 'Cocinero';

export interface OrderStep {
  step: number;
  title: string;
  completed: boolean;
}

// Mesa grouping interface for order management
export interface MesaAgrupada {
  idMesa: number;
  nombreMesa: string;
  ordenes: OrdenCompleta[];
  totalOrdenes: number;
  totalMonto: number;
  clientes: { [cliente: string]: OrdenCompleta[] };
}

export interface TipoExtra extends BaseEntity {
  nombre: string;
  descripcion?: string;
}

export interface Extra extends BaseEntity {
  nombre: string;
  descripcion?: string;
  costo: number;
  idTipoExtra: string;
}

export interface OrdenDetalleExtra extends BaseEntity {
  idOrdenDetallePlatillo: string;
  idExtra: number;
  nombreExtra: string;
  costoExtra: number;
  cantidad: number;
  importe: number;
  listo?: boolean;
  entregado?: boolean;
}