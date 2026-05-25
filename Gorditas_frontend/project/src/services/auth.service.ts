import { apiClient, ApiResponse } from './api-client';
import { appConfig } from '../config/app-config';
import { AuthUser } from '../types/auth.types';

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const authService = {
  login: (email: string, password: string): Promise<ApiResponse<LoginResponse>> =>
    apiClient.post<LoginResponse>('/auth/login', { email, password }),

  getProfile: (): Promise<ApiResponse<AuthUser>> =>
    apiClient.get<AuthUser>('/auth/profile'),

  logout: (): void => {
    localStorage.removeItem(appConfig.tokenKey);
  },

  setToken: (token: string): void => {
    localStorage.setItem(appConfig.tokenKey, token);
  },

  getToken: (): string | null => {
    return localStorage.getItem(appConfig.tokenKey);
  },
};
