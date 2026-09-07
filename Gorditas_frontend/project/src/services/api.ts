import { appConfig } from '../config/app-config';
import type { ApiResponse, PlanId, TenantConfig, TenantInfo, TenantPublicInfo, UserRole, Usuario } from '../types';

type TokenProvider = () => string | null | undefined;

export interface OnboardingPayload {
  admin: { nombre: string; apellido: string; email: string; password: string };
  nombre: string;
  slug: string;
  paleta: string;
  imagen: string | null;
  mesas: { nombre: string }[];
  platillos: { nombre: string; precio: number }[];
  guisos: { nombre: string }[];
}

export interface TenantMeResponse {
  tenant: TenantInfo;
  user: { id: string; email: string | null; nombre: string | null; role: UserRole | null; roles: UserRole[]; emailVerificado?: boolean };
}

/**
 * Cliente HTTP único del SPA. El token lo entrega el contexto de autenticación
 * (`setTokenProvider`); un 401 dispara `onUnauthorized` para reiniciar la sesión.
 */
class ApiService {
  private tokenProvider: TokenProvider = () => null;
  private onUnauthorized: (() => void) | null = null;

  setTokenProvider(provider: TokenProvider) {
    this.tokenProvider = provider;
  }

  setOnUnauthorized(handler: (() => void) | null) {
    this.onUnauthorized = handler;
  }

  private async request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${appConfig.apiBaseUrl}${endpoint}`;
    const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const token = this.tokenProvider();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch(url, { ...options, headers });
      let body: { success?: boolean; data?: unknown; message?: string; code?: string } | null = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      if (response.status === 401) this.onUnauthorized?.();
      if (!response.ok || !body?.success) {
        return {
          success: false,
          status: response.status,
          code: body?.code,
          error: body?.message || `Error ${response.status}`,
          data: body?.data,
        };
      }
      return { success: true, status: response.status, data: body.data as T, message: body.message };
    } catch (error) {
      console.error('Error de conexión con el API:', error);
      return { success: false, status: 0, error: 'Error de conexión con el servidor' };
    }
  }

  private json(method: string, body: unknown): RequestInit {
    return { method, body: JSON.stringify(body) };
  }

  // ---------- Tenants ----------
  getTenantBySlug(slug: string) {
    return this.request<TenantPublicInfo>(`/tenants/by-slug/${encodeURIComponent(slug)}`);
  }
  checkSlug(slug: string) {
    return this.request<{ slug: string; available: boolean; url?: string; reason?: string }>(`/tenants/check-slug/${encodeURIComponent(slug)}`);
  }
  getTenantMe() {
    return this.request<TenantMeResponse>('/tenants/me');
  }
  updateTenantConfig(config: Partial<TenantConfig>) {
    return this.request<{ config: TenantConfig }>('/tenants/me/config', this.json('PUT', config));
  }
  reenviarVerificacion() {
    return this.request('/tenants/me/reenviar-verificacion', { method: 'POST' });
  }
  uploadTenantLogo(file: File) {
    const form = new FormData();
    form.append('image', file);
    return this.request<{ url: string; config: TenantConfig }>('/tenants/me/logo', { method: 'POST', body: form });
  }

  // ---------- Onboarding (público) ----------
  uploadOnboardingImage(file: File) {
    const form = new FormData();
    form.append('image', file);
    return this.request<{ url: string }>('/onboarding/upload-image', { method: 'POST', body: form });
  }
  completeOnboarding(payload: OnboardingPayload) {
    return this.request<{ tenant: { slug: string; nombre: string; url: string }; url: string }>('/onboarding/complete', this.json('POST', payload));
  }

  // ---------- Billing ----------
  getPlans() {
    return this.request('/billing/plans');
  }
  createCheckout(plan: PlanId) {
    return this.request<{ url: string; sessionId: string }>('/billing/create-checkout', this.json('POST', { plan }));
  }
  createPortal() {
    return this.request<{ url: string }>('/billing/create-portal', { method: 'POST' });
  }
  getBillingStatus() {
    return this.request<{ plan: PlanId; planStatus: string; trialEndsAt: string | null; maxUsuarios: number }>('/billing/status');
  }

  // ---------- Usuarios (personal) ----------
  getUsuarios() {
    return this.request<Usuario[]>('/usuarios');
  }
  invitarUsuario(data: { nombre: string; apellido: string; email: string; role: UserRole }) {
    return this.request<Usuario>('/usuarios', this.json('POST', data));
  }
  updateUsuario(id: string, data: { nombre?: string; role?: UserRole; activo?: boolean }) {
    return this.request<Usuario>(`/usuarios/${id}`, this.json('PUT', data));
  }
  deleteUsuario(id: string) {
    return this.request(`/usuarios/${id}`, { method: 'DELETE' });
  }
  resendInvite(id: string) {
    return this.request(`/usuarios/${id}/resend-invite`, { method: 'POST' });
  }

  // ---------- Órdenes ----------
  deleteOrden(ordenId: string) {
    return this.request(`/ordenes/${ordenId}`, { method: 'DELETE' });
  }
  getOrden(ordenId: string) {
    return this.request(`/ordenes/${ordenId}`);
  }
  /** Todas las órdenes (reportes, historial). */
  getOrdenes() {
    return this.request('/ordenes?limit=1000');
  }
  /** Solo órdenes activas (no pagadas ni canceladas). */
  getOrdenesActivas() {
    return this.request('/ordenes?limit=1000&estatusNo=Pagada,Cancelado');
  }
  createOrden(orden: unknown) {
    return this.request('/ordenes/nueva', this.json('POST', orden));
  }
  addSuborden(ordenId: string, suborden: unknown) {
    return this.request(`/ordenes/${ordenId}/suborden`, this.json('POST', suborden));
  }
  addPlatillo(subordenId: string, platillo: unknown) {
    return this.request(`/ordenes/suborden/${subordenId}/platillo`, this.json('POST', platillo));
  }
  addProducto(ordenId: string, producto: unknown) {
    return this.request(`/ordenes/${ordenId}/producto`, this.json('POST', producto));
  }
  addExtra(platilloId: string, extra: unknown) {
    return this.request(`/ordenes/platillo/${platilloId}/extra`, this.json('POST', extra));
  }
  updateExtraStatus(extraDetalleId: string, estatus: string) {
    return this.request(`/ordenes/extra/${extraDetalleId}/estatus`, this.json('PUT', { estatus }));
  }
  deleteExtra(extraDetalleId: string) {
    return this.request(`/ordenes/extra/${extraDetalleId}`, { method: 'DELETE' });
  }
  removeExtra(extraDetalleId: string) {
    return this.deleteExtra(extraDetalleId);
  }
  /** El backend decide la transición según los roles del token; no se envía rol. */
  updateOrdenStatus(ordenId: string, estatus: string) {
    return this.request(`/ordenes/${ordenId}/estatus`, this.json('PUT', { estatus }));
  }
  verifyOrden(ordenId: string, isComplete: boolean) {
    return this.request(`/ordenes/${ordenId}/verificar`, this.json('PUT', { isComplete }));
  }
  getOrdenDetails(ordenId: string) {
    return this.request(`/ordenes/${ordenId}`);
  }
  markProductoListo(productoId: string) {
    return this.request(`/ordenes/producto/${productoId}/listo`, { method: 'PUT' });
  }
  markPlatilloListo(platilloId: string) {
    return this.request(`/ordenes/platillo/${platilloId}/listo`, { method: 'PUT' });
  }
  markProductoEntregado(productoId: string) {
    return this.request(`/ordenes/producto/${productoId}/entregado`, { method: 'PUT' });
  }
  markPlatilloEntregado(platilloId: string) {
    return this.request(`/ordenes/platillo/${platilloId}/entregado`, { method: 'PUT' });
  }
  removePlatillo(platilloId: string) {
    return this.request(`/ordenes/platillo/${platilloId}`, { method: 'DELETE' });
  }
  removeProducto(productoId: string) {
    return this.request(`/ordenes/producto/${productoId}`, { method: 'DELETE' });
  }
  addDetalleExtra(data: { idOrdenDetallePlatillo: string; idExtra: string; nombreExtra: string; costoExtra: number; cantidad?: number }) {
    return this.request(
      `/ordenes/platillo/${data.idOrdenDetallePlatillo}/extra`,
      this.json('POST', { idExtra: data.idExtra, nombreExtra: data.nombreExtra, costoExtra: data.costoExtra, cantidad: data.cantidad || 1 }),
    );
  }
  removeDetalleExtra(detalleExtraId: string) {
    return this.request(`/ordenes/extra/${detalleExtraId}`, { method: 'DELETE' });
  }
  updatePlatilloNota(platilloId: string, notas: string) {
    return this.request(`/ordenes/platillo/${platilloId}/nota`, this.json('PUT', { notas }));
  }
  updateOrdenFechaHora(ordenId: string) {
    return this.request(`/ordenes/${ordenId}/fecha-hora`, this.json('PUT', { fechaHora: new Date().toISOString() }));
  }

  // ---------- Inventario ----------
  getInventario() {
    return this.request('/inventario');
  }
  recibirProductos(productos: unknown) {
    return this.request('/inventario/recibir', this.json('POST', productos));
  }
  ajustarInventario(productoId: string, ajuste: unknown) {
    return this.request(`/inventario/ajustar/${productoId}`, this.json('PUT', ajuste));
  }

  // ---------- Reportes ----------
  getReporteVentas(fechaInicio?: string, fechaFin?: string) {
    const params = new URLSearchParams();
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);
    return this.request(`/reportes/ventas?${params.toString()}`);
  }
  getReporteInventario() {
    return this.request('/reportes/inventario');
  }
  getReporteGastos(fechaInicio?: string, fechaFin?: string) {
    const params = new URLSearchParams();
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);
    return this.request(`/reportes/gastos?${params.toString()}`);
  }
  getProductosVendidos() {
    return this.request('/reportes/productos-vendidos');
  }
  createGasto(gasto: { nombre: string; idTipoGasto: string; gastoTotal: number; descripcion: string }) {
    return this.request('/reportes/gastos', this.json('POST', gasto));
  }
  deleteGasto(gastoId: string) {
    return this.request(`/reportes/gastos/${gastoId}`, { method: 'DELETE' });
  }

  // ---------- Catálogos ----------
  getCatalog<T>(modelo: string): Promise<ApiResponse<T[]>> {
    return this.request(`/catalogos/${modelo}`);
  }
  createCatalogItem<T>(modelo: string, item: Partial<T>) {
    return this.request(`/catalogos/${modelo}`, this.json('POST', item));
  }
  updateCatalogItem<T>(modelo: string, id: string, item: Partial<T>) {
    return this.request(`/catalogos/${modelo}/${id}`, this.json('PUT', item));
  }
  deleteCatalogItem(modelo: string, id: string) {
    return this.request(`/catalogos/${modelo}/${id}`, { method: 'DELETE' });
  }
  getNextPedidoNumber() {
    return this.request<{ nextNumber: number }>('/catalogos/pedido/next-number');
  }
}

export const apiService = new ApiService();
