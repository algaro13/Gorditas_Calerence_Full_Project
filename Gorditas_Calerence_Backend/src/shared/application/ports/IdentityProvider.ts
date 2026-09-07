import type { Role } from '../../domain/Auth';

export interface NewAdminAccount {
  givenName: string;
  familyName: string;
  email: string;
  password: string;
}

export interface NewStaffAccount {
  orgId: string;
  givenName: string;
  familyName: string;
  email: string;
}

export interface UserProfile {
  email: string | null;
  nombre: string | null;
  emailVerified: boolean;
}

/**
 * Puerto hacia el proveedor de identidad (Zitadel en producción, Fake en pruebas).
 * Una organización del proveedor = un restaurante (tenant).
 */
export interface IdentityProvider {
  createOrganizationWithAdmin(input: { name: string; admin: NewAdminAccount }): Promise<{ orgId: string; userId: string }>;
  deleteOrganization(orgId: string): Promise<void>;
  grantProjectToOrganization(orgId: string): Promise<{ projectGrantId: string }>;
  createUser(input: NewStaffAccount): Promise<{ userId: string }>;
  /**
   * Invita a la persona: recibe un correo para crear su contraseña y entrar. Es distinto de
   * restablecer una contraseña olvidada, que usa otra plantilla y otro texto.
   */
  sendInvite(userId: string): Promise<void>;
  assignRole(input: { orgId: string; userId: string; projectGrantId: string; role: Role }): Promise<{ grantId: string }>;
  updateRole(input: { orgId: string; userId: string; grantId: string; role: Role }): Promise<void>;
  setUserActive(userId: string, active: boolean): Promise<void>;
  /**
   * Datos de la persona según el proveedor. El token de acceso no lleva correo ni nombre, así que
   * es la única forma de saber si ya confirmó su dirección y de mostrarla en la lista de personal.
   */
  getUserProfile(userId: string): Promise<UserProfile | null>;
  /** Reenvía el correo de verificación a la dirección registrada. */
  resendEmailVerification(userId: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  /** Agrega URIs a la app SPA (idempotente). */
  registerRedirectUris(input: { redirect: string[]; postLogout: string[] }): Promise<void>;
}
