import { Response, NextFunction } from 'express';
import { HybridAuthRequest } from './hybrid-auth';
import { getTenantModel, getTenantUserModel } from '../config/master-db';

/**
 * Middleware that verifies the tenant has an active subscription or valid trial.
 * Should be applied to POS routes (ordenes, inventario, reportes, catalogos)
 * but NOT to billing or tenant management routes.
 */
export const planGuard = async (req: HybridAuthRequest, res: Response, next: NextFunction) => {
  try {
    // Skip plan check if no Entra user (legacy auth during migration)
    if (!req.entraUser) {
      return next();
    }

    const TenantUser = getTenantUserModel();
    const Tenant = getTenantModel();

    const tenantUser = await TenantUser.findOne({ entraOid: req.entraUser.oid });
    if (!tenantUser) {
      return next(); // No tenant yet, let other middleware handle it
    }

    const tenant = await Tenant.findById(tenantUser.tenantId);
    if (!tenant) {
      return next();
    }

    const planStatus = tenant.planStatus || 'trial';

    // Active subscription — OK
    if (planStatus === 'active') {
      return next();
    }

    // Trial — check if still valid
    if (planStatus === 'trial') {
      const trialEnd = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null;
      if (!trialEnd || trialEnd > new Date()) {
        return next(); // Trial still valid (or no end date set = unlimited trial)
      }
      // Trial expired
      return res.status(403).json({
        success: false,
        message: 'Tu periodo de prueba ha expirado. Selecciona un plan para continuar.',
        code: 'TRIAL_EXPIRED',
      });
    }

    // Past due — allow limited access with warning
    if (planStatus === 'past_due') {
      return next(); // Allow access but frontend can show warning
    }

    // Canceled or expired
    return res.status(403).json({
      success: false,
      message: 'Suscripción inactiva. Reactiva tu plan para continuar.',
      code: 'SUBSCRIPTION_INACTIVE',
    });
  } catch (error) {
    // On error, allow access (don't block due to billing check failure)
    console.error('Plan guard error:', error);
    next();
  }
};
