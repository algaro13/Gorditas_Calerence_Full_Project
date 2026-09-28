export interface Rango {
  from: Date;
  to: Date;
}

export interface VentasReporte {
  ordenes: unknown[];
  productos: unknown[];
  platillos: unknown[];
  extras: unknown[];
  total: number;
  /**
   * `totalVentas` es lo cobrado —neto—. Con promociones dejó de ser lo mismo que lo que valían
   * los artículos, así que hacen falta las tres cifras: sin el bruto y el descuento no se puede
   * ver cuánto se regaló.
   */
  resumen: { totalVentas: number; totalBruto: number; totalDescuentos: number; cantidadOrdenes: number; promedioVenta: number };
  ventasPorDia: Array<{ _id: string; ventas: number; bruto: number; descuentos: number; ordenes: number }>;
  /** Qué dio cada promoción: la que trae gente se distingue de la que regala lo que ya se vendía. */
  descuentosPorPromocion: Array<{ _id: string; descuento: number; ordenes: number }>;
  ventasPorTipo: Array<{ _id: string; ventas: number; ordenes: number }>;
  ordenesPagadas: number;
}

export interface GastoRow {
  id: number;
  idTipoGasto: number;
  nombreTipoGasto: string;
  nombre: string;
  gastoTotal: number;
  descripcion: string | null;
  fecha: Date;
  createdAt: Date;
}

export interface GastosReporte {
  gastos: GastoRow[];
  resumen: { totalGastos: number; cantidadGastos: number; promedioGasto: number };
  gastosPorTipo: Array<{ _id: string; gastos: number; cantidad: number }>;
  gastosPorDia: Array<{ _id: string; gastos: number; cantidad: number }>;
}

export interface VendidoRow<K extends string> {
  _id: Record<K | `nombre${string}`, unknown>;
  cantidadVendida: number;
  totalVentas: number;
  vecesVendido: number;
}

/** El dinero en caja de un dia. La fecha es el dia del negocio, sin hora. */
export interface CajaRow {
  fecha: string;
  monto: number;
}

export interface ReportesQuery {
  ventas(rango: Rango | null): Promise<VentasReporte>;
  inventario(): Promise<unknown[]>;
  gastos(filter: { rango: Rango | null; idTipoGasto?: number }): Promise<GastosReporte>;
  crearGasto(data: { nombre: string; idTipoGasto: number; gastoTotal: number; descripcion: string; fecha: Date }): Promise<GastoRow | null>;
  eliminarGasto(id: number): Promise<boolean>;
  caja(rango: Rango | null): Promise<CajaRow[]>;
  fijarCaja(fecha: string, monto: number): Promise<CajaRow>;
  productosVendidos(rango: Rango | null, limit: number): Promise<{ productos: VendidoRow<'idProducto'>[]; platillos: VendidoRow<'idPlatillo'>[] }>;
}
