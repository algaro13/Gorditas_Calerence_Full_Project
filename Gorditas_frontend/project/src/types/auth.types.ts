export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  _id: string;
  nombre: string;
  email: string;
  idTipoUsuario: number;
  nombreTipoUsuario: string;
  activo: boolean;
}

export type UserRole = 'Admin' | 'Encargado' | 'Mesero' | 'Despachador' | 'Cocinero';
