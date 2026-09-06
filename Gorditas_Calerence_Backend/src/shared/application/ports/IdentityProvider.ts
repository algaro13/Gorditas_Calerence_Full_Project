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

/**
 * Puerto hacia el proveedor de identidad (Zitadel en producción, Fake en pruebas).
 * Una organización del proveedor = un restaurante (tenant).
 */
export interface IdentityProvider {
  createOrganizationWithAdmin(input: { name: string; admin: NewAdminAccount }): Promise<{ orgId: string; userId: string }>;
  deleteOrganization(orgId: string): Promise<void>;
  grantProjectToOrganization(orgId: string): Promise<{ projectGrantId: string }>;
  createUser(input: NewStaffAccount): Promise<{ userId: string }>;
  sendSetPasswordLink(userId: string): Promise<void>;
  assignRole(input: { orgId: string; userId: string; projectGrantId: string; role: Role }): Promise<{ grantId: string }>;
  updateRole(input: { orgId: string; userId: string; grantId: string; role: Role }): Promise<void>;
  setUserActive(userId: string, active: boolean): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  /** Agrega URIs a la app SPA (idempotente). */
  registerRedirectUris(input: { redirect: string[]; postLogout: string[] }): Promise<void>;
}
