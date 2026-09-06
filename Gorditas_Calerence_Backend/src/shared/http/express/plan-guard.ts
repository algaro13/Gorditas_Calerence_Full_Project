import type { RequestHandler } from 'express';
import type { Clock } from '../../application/ports/Clock';
import { accessBlockReason } from '../../domain/Tenant';
import { sendError } from './respond';

const MESSAGES = {
  TRIAL_EXPIRED: 'Tu periodo de prueba ha expirado. Selecciona un plan para continuar.',
  SUBSCRIPTION_INACTIVE: 'Suscripción inactiva. Reactiva tu plan para continuar.',
} as const;

/**
 * Bloquea las rutas de negocio cuando el plan no permite operar.
 * Estricto: sin tenant en el request no deja pasar (nunca hace next() por error).
 */
export function createPlanGuard(deps: { clock: Clock }): RequestHandler {
  return (req, res, next) => {
    const tenant = req.tenant;
    if (!tenant) {
      sendError(res, 500, 'Contexto de tenant no disponible', 'NO_TENANT_CONTEXT');
      return;
    }
    const reason = accessBlockReason(tenant, deps.clock.now());
    if (reason) {
      sendError(res, 403, MESSAGES[reason], reason, { plan: tenant.plan, planStatus: tenant.planStatus, trialEndsAt: tenant.trialEndsAt });
      return;
    }
    next();
  };
}
