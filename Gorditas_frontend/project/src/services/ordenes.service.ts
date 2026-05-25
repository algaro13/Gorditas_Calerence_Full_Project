import { apiClient, ApiResponse } from './api-client';
import { Orden, OrdenCompleta } from '../types';
import {
  CreateOrdenDTO,
  CreateSubordenDTO,
  AddProductoDTO,
  AddPlatilloDTO,
  AddExtraDTO,
  OrdenListParams,
} from '../types/orden.types';

export const ordenesService = {
  list: (params?: OrdenListParams): Promise<ApiResponse<any>> => {
    const query = new URLSearchParams();
    if (params?.estatus) query.append('estatus', params.estatus);
    if (params?.estatusNo) query.append('estatusNo', params.estatusNo);
    if (params?.mesa) query.append('mesa', params.mesa);
    if (params?.fecha) query.append('fecha', params.fecha);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return apiClient.get(`/ordenes${qs ? `?${qs}` : ''}`);
  },

  listActivas: (): Promise<ApiResponse<any>> =>
    apiClient.get('/ordenes?limit=1000&estatusNo=Pagada,Cancelado'),

  getById: (id: string): Promise<ApiResponse<OrdenCompleta>> =>
    apiClient.get<OrdenCompleta>(`/ordenes/${id}`),

  create: (data: CreateOrdenDTO): Promise<ApiResponse<Orden>> =>
    apiClient.post<Orden>('/ordenes/nueva', data),

  createSuborden: (ordenId: string, data: CreateSubordenDTO): Promise<ApiResponse<any>> =>
    apiClient.post(`/ordenes/${ordenId}/suborden`, data),

  addProducto: (ordenId: string, data: AddProductoDTO): Promise<ApiResponse<any>> =>
    apiClient.post(`/ordenes/${ordenId}/producto`, data),

  addPlatillo: (subordenId: string, data: AddPlatilloDTO): Promise<ApiResponse<any>> =>
    apiClient.post(`/ordenes/suborden/${subordenId}/platillo`, data),

  addExtra: (platilloId: string, data: AddExtraDTO): Promise<ApiResponse<any>> =>
    apiClient.post(`/ordenes/platillo/${platilloId}/extra`, data),

  updateStatus: (ordenId: string, estatus: string): Promise<ApiResponse<any>> =>
    apiClient.put(`/ordenes/${ordenId}/estatus`, { estatus }),

  updateFechaHora: (ordenId: string): Promise<ApiResponse<any>> =>
    apiClient.put(`/ordenes/${ordenId}/fecha-hora`, { fechaHora: new Date().toISOString() }),

  verificar: (ordenId: string, isComplete: boolean): Promise<ApiResponse<any>> =>
    apiClient.put(`/ordenes/${ordenId}/verificar`, { isComplete }),

  markProductoListo: (id: string): Promise<ApiResponse<any>> =>
    apiClient.put(`/ordenes/producto/${id}/listo`),

  markPlatilloListo: (id: string): Promise<ApiResponse<any>> =>
    apiClient.put(`/ordenes/platillo/${id}/listo`),

  markExtraListo: (id: string): Promise<ApiResponse<any>> =>
    apiClient.put(`/ordenes/extra/${id}/listo`),

  markProductoEntregado: (id: string): Promise<ApiResponse<any>> =>
    apiClient.put(`/ordenes/producto/${id}/entregado`),

  markPlatilloEntregado: (id: string): Promise<ApiResponse<any>> =>
    apiClient.put(`/ordenes/platillo/${id}/entregado`),

  markExtraEntregado: (id: string): Promise<ApiResponse<any>> =>
    apiClient.put(`/ordenes/extra/${id}/entregado`),

  updateExtraStatus: (id: string, estatus: string): Promise<ApiResponse<any>> =>
    apiClient.put(`/ordenes/extra/${id}/estatus`, { estatus }),

  updatePlatilloNota: (id: string, notas: string): Promise<ApiResponse<any>> =>
    apiClient.put(`/ordenes/platillo/${id}/nota`, { notas }),

  deletePlatillo: (id: string): Promise<ApiResponse<any>> =>
    apiClient.delete(`/ordenes/platillo/${id}`),

  deleteProducto: (id: string): Promise<ApiResponse<any>> =>
    apiClient.delete(`/ordenes/producto/${id}`),

  deleteExtra: (id: string): Promise<ApiResponse<any>> =>
    apiClient.delete(`/ordenes/extra/${id}`),

  deleteOrden: (id: string): Promise<ApiResponse<any>> =>
    apiClient.delete(`/ordenes/${id}`),

  getNextPedidoNumber: (): Promise<ApiResponse<{ nextNumber: number }>> =>
    apiClient.get<{ nextNumber: number }>('/catalogos/pedido/next-number'),
};
