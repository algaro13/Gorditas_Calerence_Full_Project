import { apiClient, ApiResponse } from './api-client';
import { CatalogResponse } from '../types/catalogo.types';

export const catalogosService = {
  list: <T>(modelo: string): Promise<ApiResponse<CatalogResponse<T>>> =>
    apiClient.get<CatalogResponse<T>>(`/catalogos/${modelo}`),

  create: <T>(modelo: string, data: Partial<T>): Promise<ApiResponse<T>> =>
    apiClient.post<T>(`/catalogos/${modelo}`, data),

  update: <T>(modelo: string, id: string | number, data: Partial<T>): Promise<ApiResponse<T>> =>
    apiClient.put<T>(`/catalogos/${modelo}/${id}`, data),

  delete: (modelo: string, id: string | number): Promise<ApiResponse<any>> =>
    apiClient.delete(`/catalogos/${modelo}/${id}`),

  getNextPedidoNumber: (): Promise<ApiResponse<{ nextNumber: number }>> =>
    apiClient.get<{ nextNumber: number }>('/catalogos/pedido/next-number'),
};
