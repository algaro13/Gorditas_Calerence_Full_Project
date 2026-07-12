import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { HybridAuthRequest } from './hybrid-auth';
import { getTenantUserModel, getTenantModel } from '../config/master-db';

/**
 * Middleware that disconnects and reconnects the default Mongoose connection
 * to the tenant's database. This ensures ALL models (Orden, Producto, etc.)
 * automatically use the tenant's data.
 * 
 * This is safe for low-concurrency scenarios (early SaaS stage).
 * For high concurrency, migrate to connection-per-request with useDb().
 */

// Track current DB to avoid unnecessary reconnections
let currentDbName: string | null = null;

// Cache: oid -> dbName
const cache = new Map<string, { db: string; ts: number }>();

export const tenantModelsMiddleware = async (req: HybridAuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.entraUser?.oid) return next();

    const oid = req.entraUser.oid;
    let dbName: string | null = null;

    // Cache lookup
    const hit = cache.get(oid);
    if (hit && (Date.now() - hit.ts < 300000)) {
      dbName = hit.db;
      console.log(`📋 Cache hit: ${oid.substring(0,8)}... → ${dbName}`);
    } else {
      console.log(`📋 Cache miss for: ${oid.substring(0,8)}... Looking up in master DB...`);
      const TenantUser = getTenantUserModel();
      const user = await TenantUser.findOne({ entraOid: oid });
      console.log(`📋 TenantUser found:`, user ? `tenantId=${user.tenantId}` : 'NULL');
      if (user) {
        const Tenant = getTenantModel();
        const tenant = await Tenant.findById(user.tenantId);
        console.log(`📋 Tenant found:`, tenant ? `dbName=${tenant.dbName}` : 'NULL');
        if (tenant) {
          dbName = tenant.dbName;
          cache.set(oid, { db: dbName, ts: Date.now() });
        }
      }
    }

    if (!dbName) {
      console.log('⚠️ tenantModelsMiddleware: No dbName found for oid:', oid);
      return next();
    }

    // If already connected to this tenant's DB, skip reconnection
    if (currentDbName === dbName) return next();

    // Switch the default connection to the tenant's database
    const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mi_tienda_gorditas';
    
    // Build the URI for the tenant's DB by replacing the database name
    let tenantUri: string;
    if (baseUri.includes('?')) {
      tenantUri = baseUri.replace(/\/[^/?]+\?/, `/${dbName}?`);
    } else {
      tenantUri = baseUri.replace(/\/[^/]+$/, `/${dbName}`);
    }

    console.log(`🔄 Switching DB: ${currentDbName || 'default'} → ${dbName}`);

    // Close existing connection and create new one
    try {
      await mongoose.connection.close();
      await mongoose.connect(tenantUri);
      currentDbName = dbName;
      console.log(`✅ Now connected to: ${mongoose.connection.db?.databaseName}`);
    } catch (connError) {
      console.error('❌ Failed to switch DB:', connError);
    }

    next();
  } catch (error) {
    console.error('Tenant switch error:', error);
    next();
  }
};
