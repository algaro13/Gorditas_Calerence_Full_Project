import { appConfig } from '../config/app-config';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem(appConfig.tokenKey);
  }

  private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${appConfig.apiBaseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: this.getHeaders(options.headers as Record<string, string>),
      });

      const data = await response.json();

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
        message: data.message,
      };
    } catch (error) {
      console.error('❌ API Client error:', error);
      return {
        success: false,
        error: 'Error de conexión con el servidor',
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
