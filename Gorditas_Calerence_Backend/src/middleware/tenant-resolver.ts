import { Response, NextFunction } from 'express';
import { EntraAuthRequest } from './entra-auth';
import { getTenantModel, getTenantUserModel } from '../config/master-db';
import { getTenantConnection } from '../config/tenant-connection';
import { registerTenantModels } from '../config/tenant-models';
import mongoose from 'mongoose';

// In-memory cache for tenant resolution (slug → tenant doc)
const tenantCache = new Map<string, { tenant: any; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface TenantRequest extends EntraAuthRequest {
  tenant?: {
    id: string;
    slug: string;
    nombre: string;
    dbName: string;
    plan: string;
    config: any;
  };
  tenantConnection?: mongoose.Connection;
}

function extractSlug(req: EntraAuthRequest): string | null {
  // 1. Check X-Tenant-Slug header (for development and API calls)
  const headerSlug = req.header('X-Tenant-Slug');
  if (headerSlug) return headerSlug;

  // 2. Extract from Origin header (for browser requests)
  const origin = req.header('Origin') || req.header('Referer') || '';
  const match = origin.match(/pos-([^.]+)\.kustodela\.com/);
  if (match) return match[1];

  return null;
}

export const tenantResolver = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const slug = extractSlug(req);

    if (!slug) {
      return res.status(400).json({ success: false, message: 'Tenant no identificado. Falta header X-Tenant-Slug o subdominio válido.' });
    }

    // Check cache first
    const cached = tenantCache.get(slug);
    if (cached && cached.expiry > Date.now()) {
      req.tenant = cached.tenant;
    } else {
      // Query master DB
      const Tenant = getTenantModel();
      const tenant = await Tenant.findOne({ slug });

      if (!tenant) {
        return res.status(404).json({ success: false, message: 'Tenant no encontrado' });
      }

      if (!tenant.activo) {
        return res.status(403).json({ success: false, message: 'Cuenta suspendida' });
      }

      const tenantData = {
        id: tenant._id.toString(),
        slug: tenant.slug,
        nombre: tenant.nombre,
        dbName: tenant.dbName,
        plan: tenant.plan,
        config: tenant.config,
      };

      // Update cache
      tenantCache.set(slug, { tenant: tenantData, expiry: Date.now() + CACHE_TTL });
      req.tenant = tenantData;
    }

    // Get/create connection to tenant's database and register models
    const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/default';
    req.tenantConnection = getTenantConnection(req.tenant!.dbName, baseUri);
    registerTenantModels(req.tenantConnection);

    next();
  } catch (error: any) {
    console.error('Tenant resolver error:', error);
    return res.status(500).json({ success: false, message: 'Error al resolver tenant' });
  }
};

// Middleware to resolve user within tenant
export const resolveUser = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.entraUser) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const TenantUser = getTenantUserModel();
    const tenantUser = await TenantUser.findOne({ entraOid: req.entraUser.oid });

    if (!tenantUser) {
      return res.status(403).json({ success: false, message: 'Usuario no asignado a ningún tenant. Complete el registro.' });
    }

    if (!tenantUser.activo) {
      return res.status(403).json({ success: false, message: 'Usuario desactivado' });
    }

    // Attach user info for controllers
    req.user = {
      _id: tenantUser._id,
      entraOid: tenantUser.entraOid,
      email: tenantUser.email,
      nombre: tenantUser.nombre,
      nombreTipoUsuario: tenantUser.role,
      activo: tenantUser.activo,
    };

    next();
  } catch (error: any) {
    console.error('Resolve user error:', error);
    return res.status(500).json({ success: false, message: 'Error al resolver usuario' });
  }
};

// Clear cache for a specific tenant (useful when updating tenant config)
export function invalidateTenantCache(slug: string): void {
  tenantCache.delete(slug);
}
