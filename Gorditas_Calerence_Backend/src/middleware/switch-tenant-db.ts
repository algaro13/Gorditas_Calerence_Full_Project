import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { HybridAuthRequest } from './hybrid-auth';
import { getTenantUserModel, getTenantModel } from '../config/master-db';
import { registerTenantModels } from '../config/tenant-models';
import { getTenantConnection } from '../config/tenant-connection';

// Cache: entraOid -> dbName
const userDbCache = new Map<string, { dbName: string; expiry: number }>();

/**
 * Switches the mongoose default connection to the tenant's database.
 * Works by using useDb() which shares the connection pool.
 * 
 * After this middleware, mongoose.connection.useDb(dbName) models are available
 * and the route handlers will use them via the patched global models.
 */
export const switchTenantDb = async (req: HybridAuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.entraUser?.oid) return next();

    const oid = req.entraUser.oid;

    // Get tenant DB name (cached)
    let dbName: string | null = null;
    const cached = userDbCache.get(oid);
    if (cached && cached.expiry > Date.now()) {
      dbName = cached.dbName;
    } else {
      const TenantUser = getTenantUserModel();
      const tenantUser = await TenantUser.findOne({ entraOid: oid });
      if (tenantUser) {
        const Tenant = getTenantModel();
        const tenant = await Tenant.findById(tenantUser.tenantId);
        if (tenant) {
          dbName = tenant.dbName;
          userDbCache.set(oid, { dbName, expiry: Date.now() + 300000 });
        }
      }
    }

    if (!dbName) return next();

    // Get the default connection's current DB
    const defaultDb = mongoose.connection.db?.databaseName;

    // If it's already the right DB, no switch needed
    if (dbName === defaultDb) return next();

    // Get or create a connection to the tenant's DB
    const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mi_tienda_gorditas';
    const tenantConn = getTenantConnection(dbName, baseUri);
    registerTenantModels(tenantConn);

    // Store on req for routes that need tenant-specific models
    req.tenantConnection = tenantConn;
    (req as any).tenantModels = tenantConn.models;

    next();
  } catch (error) {
    console.error('Switch tenant DB error:', error);
    next();
  }
};
