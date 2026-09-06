import type { UserRole } from '../types';
import { ZITADEL_PROJECT_ID } from '../config/auth-config';

export const ROLE_ORDER: UserRole[] = ['Admin', 'Encargado', 'Mesero', 'Despachador', 'Cocinero'];
export const ORG_CLAIM = 'urn:zitadel:iam:user:resourceowner:id';
export const rolesClaim = (projectId: string = ZITADEL_PROJECT_ID) => `urn:zitadel:iam:org:project:${projectId}:roles`;

export type Claims = Record<string, unknown>;

/** Decodifica el payload de un JWT sin verificarlo (la verificación la hace el backend). */
export function decodeJwtPayload(token: string): Claims {
  const part = token.split('.')[1];
  if (!part) return {};
  try {
    const binary = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return {};
  }
}

export function orgIdFromClaims(claims: Claims): string | null {
  const v = claims[ORG_CLAIM];
  return typeof v === 'string' && v ? v : null;
}

/** Roles del proyecto concedidos dentro de la organización del token. */
export function rolesForOrg(claims: Claims, orgId: string | null): UserRole[] {
  const raw = claims[rolesClaim()];
  if (!raw || typeof raw !== 'object' || !orgId) return [];
  const out: UserRole[] = [];
  for (const role of ROLE_ORDER) {
    const orgs = (raw as Record<string, unknown>)[role];
    if (orgs && typeof orgs === 'object' && orgId in (orgs as Record<string, unknown>)) out.push(role);
  }
  return out;
}

export function primaryRoleOf(roles: UserRole[]): UserRole | null {
  return ROLE_ORDER.find((r) => roles.includes(r)) ?? null;
}
