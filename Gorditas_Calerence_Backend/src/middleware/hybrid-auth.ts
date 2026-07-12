import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { Usuario } from '../models';
import { UserRole } from '../types';
import { getTenantUserModel, getTenantModel } from '../config/master-db';
import { getTenantConnection } from '../config/tenant-connection';
import { registerTenantModels } from '../config/tenant-models';

export interface HybridAuthRequest extends Request {
  user?: any;
  entraUser?: { oid: string; email: string; name: string };
  tenantConnection?: any;
  tenantModels?: any;
}

// JWKS client for Entra token validation (cached)
// CIAM tenant uses this endpoint for ID tokens
const client = jwksClient({
  jwksUri: `https://calerence.ciamlogin.com/f126e948-b284-4332-ade2-6cffc98a879d/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 36000000,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

// Fallback: sts.windows.net keys (for access tokens issued by v1.0)
const stsClient = jwksClient({
  jwksUri: `https://login.microsoftonline.com/f126e948-b284-4332-ade2-6cffc98a879d/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 36000000,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  // Try CIAM keys first, then STS keys
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      // Fallback to STS keys
      stsClient.getSigningKey(header.kid, (err2, key2) => {
        if (err2) return callback(err2);
        callback(null, key2?.getPublicKey());
      });
      return;
    }
    callback(null, key?.getPublicKey());
  });
}

async function validateEntraToken(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      algorithms: ['RS256'],
      // Accept multiple issuers (v1.0 and v2.0 formats)
      issuer: [
        `https://f126e948-b284-4332-ade2-6cffc98a879d.ciamlogin.com/f126e948-b284-4332-ade2-6cffc98a879d/v2.0`,
        `https://calerence.ciamlogin.com/f126e948-b284-4332-ade2-6cffc98a879d/v2.0`,
        `https://sts.windows.net/f126e948-b284-4332-ade2-6cffc98a879d/`,
      ],
      audience: 'fe1da7e9-2e49-470b-8ac4-5534f45d2a9b',
    }, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
}

async function validateLegacyToken(token: string): Promise<any> {
  const JWT_SECRET = process.env.JWT_SECRET || 'StAn121120360ne';
  const decoded = jwt.verify(token, JWT_SECRET) as any;
  const user = await Usuario.findById(decoded.id);
  if (!user || !user.activo) return null;
  return user;
}

/**
 * Hybrid authentication middleware:
 * - First tries to validate as Microsoft Entra token (RS256)
 * - If that fails, tries legacy JWT token (HS256)
 * This allows gradual migration from legacy auth to Entra.
 */
export const hybridAuth = async (req: HybridAuthRequest, res: Response, next: NextFunction) => {
  // Skip if already authenticated (middleware was already applied at router level)
  if (req.entraUser || req.user) {
    return next();
  }

  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Debug: decode without verification to see what's in the token
    const decodedHeader = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
    const decodedPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    console.log('🔍 Token header:', JSON.stringify(decodedHeader));
    console.log('🔍 Token payload iss:', decodedPayload.iss);
    console.log('🔍 Token payload aud:', decodedPayload.aud);
    console.log('🔍 Token payload sub:', decodedPayload.sub);
    console.log('🔍 Token payload ver:', decodedPayload.ver);

    // Try Entra token first (RS256 - starts with eyJ and has 3 parts)
    try {
      const decoded = await validateEntraToken(token);
      console.log('✅ Entra token validated:', JSON.stringify(decoded, null, 2).substring(0, 500));
      const oid = decoded.oid || decoded.sub;
      const email = decoded.emails?.[0] || decoded.email || decoded.preferred_username || '';
      const name = decoded.name || decoded.given_name || '';

      // Look up user in TenantUser collection
      const TenantUser = getTenantUserModel();
      let tenantUser = await TenantUser.findOne({ entraOid: oid });

      if (!tenantUser) {
        // Auto-link: try to find by email in legacy users
        const legacyUser = await Usuario.findOne({ email: email.toLowerCase(), activo: true });
        if (legacyUser) {
          // Create TenantUser linked to existing legacy user
          tenantUser = new TenantUser({
            entraOid: oid,
            tenantId: 'gorditas-calerence', // Default for migration
            email: email.toLowerCase(),
            nombre: name || legacyUser.nombre,
            role: legacyUser.nombreTipoUsuario || 'Admin',
            activo: true,
          });
          await tenantUser.save();
          console.log(`✅ Auto-linked Entra user ${email} to legacy user`);
        }
      }

      // Set user on request (compatible with existing controllers)
      req.user = {
        _id: tenantUser?._id || oid,
        nombre: tenantUser?.nombre || name,
        email: tenantUser?.email || email,
        nombreTipoUsuario: tenantUser?.role || 'Admin',
        idTipoUsuario: 1,
        activo: true,
        toJSON: function() { return { ...this, toJSON: undefined }; },
      };

      req.entraUser = { oid, email, name };

      // Connect to tenant's database if user has a tenant
      if (tenantUser?.tenantId) {
        try {
          const Tenant = getTenantModel();
          const tenant = await Tenant.findById(tenantUser.tenantId);
          if (tenant) {
            const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/default';
            const conn = getTenantConnection(tenant.dbName, baseUri);
            registerTenantModels(conn);
            req.tenantConnection = conn;
            req.tenantModels = conn.models;
          }
        } catch (err) {
          // Non-blocking: if tenant DB fails, continue with global
          console.error('Failed to connect tenant DB:', err);
        }
      }

      return next();
    } catch (entraError: any) {
      // Entra validation failed, try legacy
      console.log('⚠️ Entra validation failed:', entraError.message);
    }

    // Try legacy token
    try {
      const user = await validateLegacyToken(token);
      if (user) {
        req.user = user;
        return next();
      }
    } catch (legacyError) {
      // Legacy also failed
    }

    return res.status(401).json({ success: false, message: 'Token no válido' });
  } catch (error: any) {
    return res.status(401).json({ success: false, message: 'Error de autenticación' });
  }
};

// Role-based authorization (works with both auth methods)
export const authorize = (...roles: string[]) => {
  return (req: HybridAuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }
    const userRole = req.user.nombreTipoUsuario || req.user.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para esta acción' });
    }
    next();
  };
};

export const isAdmin = authorize(UserRole.ADMIN);
export const isEncargado = authorize(UserRole.ADMIN, UserRole.ENCARGADO);
export const isMesero = authorize(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.MESERO);
export const isDespachador = authorize(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.DESPACHADOR);
export const isCocinero = authorize(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.COCINERO);
