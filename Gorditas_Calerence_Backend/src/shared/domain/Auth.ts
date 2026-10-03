/** Roles del POS. Coinciden con los project roles de Zitadel y con el enum TenantRole de Prisma. */
export const ROLES = ['Admin', 'Encargado', 'Mesero', 'Despachador', 'Cocinero'] as const;
export type Role = (typeof ROLES)[number];

/** Orden de precedencia: el primero que tenga el usuario es su "rol principal". */
export const ROLE_PRECEDENCE: readonly Role[] = ROLES;

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function primaryRoleOf(roles: readonly Role[]): Role | null {
  return ROLE_PRECEDENCE.find((r) => roles.includes(r)) ?? null;
}

/**
 * Rol de quien opera la plataforma (la consola con todos los restaurantes). No es un rol del POS:
 * no está en `ROLES` y los restaurantes no lo reciben del proyecto, así que no pueden concederlo.
 */
export const ROL_PLATAFORMA = 'Plataforma';

/** Principal autenticado, derivado del access token de Zitadel. */
export interface AuthInfo {
  userId: string;
  orgId: string;
  roles: Role[];
  primaryRole: Role | null;
  email: string;
  name: string;
  /** Opera la plataforma: rol «Plataforma» en la organización de la plataforma. */
  plataforma: boolean;
}
