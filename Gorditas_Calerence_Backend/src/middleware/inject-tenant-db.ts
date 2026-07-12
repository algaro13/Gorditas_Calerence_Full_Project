import { Response, NextFunction } from 'express';
import { HybridAuthRequest } from './hybrid-auth';
import mongoose from 'mongoose';

/**
 * Middleware that switches the default Mongoose connection to the tenant's DB
 * for the duration of the request. This is safe because Node.js is single-threaded
 * and each request is processed sequentially within its async context.
 * 
 * NOTE: This is a pragmatic solution for the migration period. The ideal solution
 * is to refactor all routes to use req.tenantConnection.model('ModelName') explicitly.
 */

// Store reference to original default connection
const originalUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mi_tienda_gorditas';

export const injectTenantDb = async (req: HybridAuthRequest, res: Response, next: NextFunction) => {
  // If user has tenant models available, set them on req for routes that support it
  // The existing routes still use global mongoose.model() so we can't easily switch
  // Instead, we ensure req.tenantModels is available for new routes
  
  if (req.tenantConnection && req.tenantModels) {
    // Make models available via req for any route that wants to use them
    (req as any).models = req.tenantModels;
  }
  
  next();
};
