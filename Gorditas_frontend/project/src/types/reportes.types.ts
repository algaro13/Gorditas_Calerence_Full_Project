export interface CreateGastoDTO {
  nombre: string;
  idTipoGasto: string;
  gastoTotal: number;
  descripcion: string;
}

export interface ReporteVentasResponse {
  ordenes: any[];
  productos: any[];
  platillos: any[];
  extras: any[];
  pagination: { total: number };
  resumen: { totalVentas: number; cantidadOrdenes: number; promedioVenta: number };
  ventasPorDia: any[];
  ventasPorTipo: any[];
  ordenesPagadas: number;
}

export interface ReporteGastosResponse {
  gastos: any[];
  resumen: { totalGastos: number; cantidadGastos: number; promedioGasto: number };
  gastosPorTipo: any[];
  gastosPorDia: any[];
}
