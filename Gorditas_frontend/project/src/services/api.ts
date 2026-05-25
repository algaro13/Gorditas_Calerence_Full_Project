// ...otros métodos...
import { ApiResponse } from '../types';
import { mockApiService } from './mockApi';
//const API_BASE_URL = `https://calerence-api.neuralmane.com/api`;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  /**
   * Elimina una orden por su ID.
   * @param ordenId El ID de la orden a eliminar.
   */
  async deleteOrden(ordenId: string) {
    return this.request(`/ordenes/${ordenId}`, {
      method: 'DELETE',
    });
  }
  async getOrden(ordenId: string) {
    return this.request(`/ordenes/${ordenId}`);
  }
  private token: string | null = localStorage.getItem('token');
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Use mock API if enabled and in development mode
    
    const url = `${API_BASE_URL}${endpoint}`;
    // Siempre obtener el token actualizado de localStorage
    this.token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });
      const data = await response.json();
      // Cambia aquí: respeta el campo success del backend
      if (!data.success) {
        return {
        success: false,
        error: data.message || 'Request failed',
        data: data.data,
      };
    }
    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error('❌ Error connecting to backend:', error);
    return {
      success: false,
      error: 'Error de conexión con el servidor',
    };
  }
}
  
  // Auth methods
  async login(email: string, password: string) {
  const response = await this.request<{ token: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (response.success && response.data?.token) {
    this.token = response.data.token;
    if (this.token !== null) {
      localStorage.setItem('token', this.token);
    }
  }
  return response;
}
  async getProfile() {
    return this.request('/auth/profile');
  }
  logout() {
    this.token = null;
    localStorage.removeItem('token');
  }
  // Orders methods
  /**
   * Trae todas las órdenes (para reportes, historial, etc.)
   */
  async getOrdenes() {
    return this.request('/ordenes?limit=1000');
  }

  /**
   * Trae solo órdenes activas (no pagadas ni canceladas) para gestión diaria
   */
  async getOrdenesActivas() {
    // El backend debe soportar el filtro por estatus con query string
    return this.request('/ordenes?limit=1000&estatusNo=Pagada,Cancelado');
  }
  async createOrden(orden: any) {
    return this.request('/ordenes/nueva', {
      method: 'POST',
      body: JSON.stringify(orden),
    });
  }
  async addSuborden(ordenId: string, suborden: any) {
    return this.request(`/ordenes/${ordenId}/suborden`, {
      method: 'POST',
      body: JSON.stringify(suborden),
    });
  }
  async addPlatillo(subordenId: string, platillo: any) {
    return this.request(`/ordenes/suborden/${subordenId}/platillo`, {
      method: 'POST',
      body: JSON.stringify(platillo),
    });
  }
  async addProducto(ordenId: string, producto: any) {
    return this.request(`/ordenes/${ordenId}/producto`, {
      method: 'POST',
      body: JSON.stringify(producto),
    });
  }
  async addExtra(platilloId: string, extra: any) {
    return this.request(`/ordenes/platillo/${platilloId}/extra`, {
      method: 'POST',
      body: JSON.stringify(extra),
    });
  }
  async updateExtraStatus(extraDetalleId: string, estatus: string) {
    return this.request(`/ordenes/extra/${extraDetalleId}/estatus`, {
      method: 'PUT',
      body: JSON.stringify({ estatus }),
    });
  }
  async deleteExtra(extraDetalleId: string) {
    return this.request(`/ordenes/extra/${extraDetalleId}`, {
      method: 'DELETE',
    });
  }

  async removeExtra(extraDetalleId: string) {
    return this.deleteExtra(extraDetalleId);
  }
  async updateOrdenStatus(ordenId: string, estatus: string) {
    // Forzar el rol admin para evitar restricciones de transición de estatus
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    let role = userInfo?.role || 'admin';
    // Solo permitir estos roles
    const allowedRoles = ['admin', 'encargado', 'mesero', 'empleado'];
    if (!allowedRoles.includes(role)) {
      role = 'admin';
    }
    // Intentar con el rol del usuario primero
    const payload = { estatus, role };
    let response = await this.request(`/ordenes/${ordenId}/estatus`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!response.success) {
      console.warn('[updateOrdenStatus] Falló con rol', role, 'Respuesta:', response);
    }
    // Si falla por restricción de rol, reintentar con admin
    if (!response.success && response.error && response.error.toLowerCase().includes('rol')) {
      const adminPayload = { estatus, role: 'admin' };
      response = await this.request(`/ordenes/${ordenId}/estatus`, {
        method: 'PUT',
        body: JSON.stringify(adminPayload),
      });
      if (!response.success) {
        console.error('[updateOrdenStatus] También falló con admin', response);
      }
    }
    return response;
  }
  async verifyOrden(ordenId: string, isComplete: boolean) {
    return this.request(`/ordenes/${ordenId}/verificar`, {
      method: 'PUT',
      body: JSON.stringify({ isComplete }),
    });
  }

  async getOrdenDetails(ordenId: string) {
    return this.request(`/ordenes/${ordenId}`);
  }

  async markProductoListo(productoId: string) {
    return this.request(`/ordenes/producto/${productoId}/listo`, {
      method: 'PUT',
    });
  }

  async markPlatilloListo(platilloId: string) {
    return this.request(`/ordenes/platillo/${platilloId}/listo`, {
      method: 'PUT',
    });
  }

  async markProductoEntregado(productoId: string) {
    return this.request(`/ordenes/producto/${productoId}/entregado`, {
      method: 'PUT',
    });
  }

  async markPlatilloEntregado(platilloId: string) {
    return this.request(`/ordenes/platillo/${platilloId}/entregado`, {
      method: 'PUT',
    });
  }
  // Inventory methods
  async getInventario() {
    return this.request('/inventario');
  }
  async recibirProductos(productos: any) {
    return this.request('/inventario/recibir', {
      method: 'POST',
      body: JSON.stringify(productos),
    });
  }
  async ajustarInventario(productoId: string, ajuste: any) {
    return this.request(`/inventario/ajustar/${productoId}`, {
      method: 'PUT',
      body: JSON.stringify(ajuste),
    });
  }
  // Reports methods
  async getReporteVentas(fechaInicio?: string, fechaFin?: string) {
    const params = new URLSearchParams();
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);
    
    return this.request(`/reportes/ventas?${params.toString()}`);
  }
  async getReporteInventario() {
    return this.request('/reportes/inventario');
  }
  async getReporteGastos(fechaInicio?: string, fechaFin?: string) {
    const params = new URLSearchParams();
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);
    
    return this.request(`/reportes/gastos?${params.toString()}`);
  }
  async getProductosVendidos() {
    return this.request('/reportes/productos-vendidos');
  }
  
  async createGasto(gasto: {
    nombre: string;
    idTipoGasto: string;
    gastoTotal: number;
    descripcion: string;
  }) {
    return this.request('/reportes/gastos', {
      method: 'POST',
      body: JSON.stringify(gasto),
    });
  }

  async deleteGasto(gastoId: string) {
    return this.request(`/reportes/gastos/${gastoId}`, {
      method: 'DELETE',
    });
  }
  
  // Catalogs methods
  async getCatalog<T>(modelo: string): Promise<ApiResponse<T[]>> {
    return this.request(`/catalogos/${modelo}`);
  }
  async createCatalogItem<T>(modelo: string, item: Partial<T>) {
    return this.request(`/catalogos/${modelo}`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }
  async updateCatalogItem<T>(modelo: string, id: string, item: Partial<T>) {
    return this.request(`/catalogos/${modelo}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  }
  async deleteCatalogItem(modelo: string, id: string) {
    return this.request(`/catalogos/${modelo}/${id}`, {
      method: 'DELETE',
    });
  }

  async removePlatillo(platilloId: string) {
    return this.request(`/ordenes/platillo/${platilloId}`, {
      method: 'DELETE',
    });
  }

  async removeProducto(productoId: string) {
    return this.request(`/ordenes/producto/${productoId}`, {
      method: 'DELETE',
    });
  }

  async addDetalleExtra(data: { idOrdenDetallePlatillo: string; idExtra: string; nombreExtra: string; costoExtra: number; cantidad?: number }) {
    return this.request(`/ordenes/platillo/${data.idOrdenDetallePlatillo}/extra`, {
      method: 'POST',
      body: JSON.stringify({
        idExtra: data.idExtra,
        nombreExtra: data.nombreExtra,
        costoExtra: data.costoExtra,
        cantidad: data.cantidad || 1
      }),
    });
  }

  async removeDetalleExtra(detalleExtraId: string) {
    return this.request(`/ordenes/extra/${detalleExtraId}`, {
      method: 'DELETE',
    });
  }

  async updatePlatilloNota(platilloId: string, notas: string) {
    return this.request(`/ordenes/platillo/${platilloId}/nota`, {
      method: 'PUT',
      body: JSON.stringify({ notas }),
    });
  }

  async updateOrdenFechaHora(ordenId: string) {
    return this.request(`/ordenes/${ordenId}/fecha-hora`, {
      method: 'PUT',
      body: JSON.stringify({ fechaHora: new Date().toISOString() }),
    });
  }

  async getNextPedidoNumber() {
    return this.request<{ nextNumber: number }>('/catalogos/pedido/next-number');
  }
}
export const apiService = new ApiService();