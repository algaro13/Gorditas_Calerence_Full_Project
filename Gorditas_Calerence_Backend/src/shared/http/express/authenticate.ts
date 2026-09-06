import type { RequestHandler } from 'express';
import { jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import { isRole, primaryRoleOf, type AuthInfo, type Role } from '../../domain/Auth';
import { sendError } from './respond';

export interface AuthenticateOptions {
  issuer: string;
  audience: string;
  projectId: string;
  /** JWKS remoto (createRemoteJWKSet) o local (createLocalJWKSet) para pruebas. */
  jwks: JWTVerifyGetKey;
}

export const CLAIM_ORG_ID = 'urn:zitadel:iam:user:resourceowner:id';
export const CLAIM_ROLES_GENERIC = 'urn:zitadel:iam:org:project:roles';
export const claimRolesForProject = (projectId: string): string => `urn:zitadel:iam:org:project:${projectId}:roles`;

type RolesClaim = Record<string, Record<string, string> | undefined>;

/** Roles del token que aplican a la organización `orgId` (los de otras orgs se ignoran). */
export function rolesForOrg(payload: JWTPayload, projectId: string, orgId: string): Role[] {
  const perProject = payload[claimRolesForProject(projectId)] as RolesClaim | undefined;
  const generic = payload[CLAIM_ROLES_GENERIC] as RolesClaim | undefined;
  const claim: RolesClaim = perProject ?? generic ?? {};
  const roles: Role[] = [];
  for (const [role, orgs] of Object.entries(claim)) {
    if (!isRole(role) || !orgs || typeof orgs !== 'object') continue;
    if (Object.prototype.hasOwnProperty.call(orgs, orgId)) roles.push(role);
  }
  return roles;
}

export function authInfoFromPayload(payload: JWTPayload, projectId: string): AuthInfo | null {
  const orgId = payload[CLAIM_ORG_ID];
  if (!payload.sub || typeof orgId !== 'string' || orgId.length === 0) return null;
  const roles = rolesForOrg(payload, projectId, orgId);
  const name =
    (typeof payload.name === 'string' && payload.name) ||
    [payload.given_name, payload.family_name].filter((p) => typeof p === 'string' && p).join(' ') ||
    (typeof payload.preferred_username === 'string' ? payload.preferred_username : '');
  return {
    userId: payload.sub,
    orgId,
    roles,
    primaryRole: primaryRoleOf(roles),
    email: typeof payload.email === 'string' ? payload.email : '',
    name,
  };
}

export function createAuthenticate(opts: AuthenticateOptions): RequestHandler {
  return async (req, res, next) => {
    const header = req.header('Authorization') ?? '';
    if (!header.startsWith('Bearer ') || header.length <= 7) {
      sendError(res, 401, 'Token no proporcionado', 'NO_TOKEN');
      return;
    }
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(header.slice(7), opts.jwks, {
        issuer: opts.issuer,
        audience: opts.audience,
        algorithms: ['RS256'],
      }));
    } catch {
      sendError(res, 401, 'Token no válido', 'INVALID_TOKEN');
      return;
    }
    const auth = authInfoFromPayload(payload, opts.projectId);
    if (!auth) {
      sendError(res, 401, 'Token sin organización', 'TOKEN_WITHOUT_ORG');
      return;
    }
    req.auth = auth;
    next();
  };
}

/** Permite el acceso si el usuario tiene al menos uno de los roles indicados. */
export function authorize(...allowed: Role[]): RequestHandler {
  return (req, res, next) => {
    if (!req.auth) {
      sendError(res, 401, 'No autenticado', 'UNAUTHORIZED');
      return;
    }
    if (!req.auth.roles.some((r) => allowed.includes(r))) {
      sendError(res, 403, 'No tienes permisos para esta acción', 'FORBIDDEN');
      return;
    }
    next();
  };
}

export const isAdmin = authorize('Admin');
export const isEncargado = authorize('Admin', 'Encargado');
export const isMesero = authorize('Admin', 'Encargado', 'Mesero');
export const isDespachador = authorize('Admin', 'Encargado', 'Despachador');
export const isCocinero = authorize('Admin', 'Encargado', 'Cocinero');
