import { apiClient, ApiResponse } from './api-client';
import { CreateGastoDTO, ReporteVentasResponse, ReporteGastosResponse } from '../types/reportes.types';

export const reportesService = {
  getVentas: (fechaInicio?: string, fechaFin?: string): Promise<ApiResponse<ReporteVentasResponse>> => {
    const params = new URLSearchParams();
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);
    return apiClient.get<ReporteVentasResponse>(`/reportes/ventas?${params.toString()}`);
  },

  getInventario: (): Promise<ApiResponse<any>> =>
    apiClient.get('/reportes/inventario'),

  getGastos: (fechaInicio?: string, fechaFin?: string): Promise<ApiResponse<ReporteGastosResponse>> => {
    const params = new URLSearchParams();
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);
    return apiClient.get<ReporteGastosResponse>(`/reportes/gastos?${params.toString()}`);
  },

  createGasto: (data: CreateGastoDTO): Promise<ApiResponse<any>> =>
    apiClient.post('/reportes/gastos', data),

  deleteGasto: (id: string): Promise<ApiResponse<any>> =>
    apiClient.delete(`/reportes/gastos/${id}`),

  getProductosVendidos: (fechaInicio?: string, fechaFin?: string, limit?: number): Promise<ApiResponse<any>> => {
    const params = new URLSearchParams();
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);
    if (limit) params.append('limit', String(limit));
    return apiClient.get(`/reportes/productos-vendidos?${params.toString()}`);
  },
};
