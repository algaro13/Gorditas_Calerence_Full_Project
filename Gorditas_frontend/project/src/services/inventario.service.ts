import { apiClient, ApiResponse } from './api-client';
import { RecibirProductoItem, AjustarInventarioDTO, InventarioResponse } from '../types/inventario.types';

export const inventarioService = {
  getInventario: (): Promise<ApiResponse<InventarioResponse>> =>
    apiClient.get<InventarioResponse>('/inventario'),

  recibirProductos: (productos: RecibirProductoItem[]): Promise<ApiResponse<any>> =>
    apiClient.post('/inventario/recibir', { productos }),

  ajustarInventario: (productoId: string, data: AjustarInventarioDTO): Promise<ApiResponse<any>> =>
    apiClient.put(`/inventario/ajustar/${productoId}`, data),
};
