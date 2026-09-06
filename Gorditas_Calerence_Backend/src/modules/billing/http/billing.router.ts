import { Router, type RequestHandler } from 'express';
import Joi from 'joi';
import { asyncHandler } from '../../../shared/http/express/async-handler';
import { isAdmin } from '../../../shared/http/express/authenticate';
import { sendOk } from '../../../shared/http/express/respond';
import { validateBody } from '../../../shared/http/express/validate';
import type { CrearCheckout, CrearPortal, EstadoBilling, ProcesarWebhook } from '../application/use-cases/Billing';
import { PLAN_CATALOG } from '../domain/plans';

export interface BillingUseCases {
  crearCheckout: CrearCheckout;
  crearPortal: CrearPortal;
  estado: EstadoBilling;
  webhook: ProcesarWebhook;
}

/** Handler del webhook: se monta con express.raw ANTES de express.json. */
export function createBillingWebhookHandler(uc: BillingUseCases): RequestHandler {
  return asyncHandler(async (req, res) => {
    const result = await uc.webhook.execute(req.body as Buffer, req.header('stripe-signature'));
    res.json(result);
  });
}

export function createBillingRouter(uc: BillingUseCases, deps: { authenticate: RequestHandler; tenantContext: RequestHandler }): Router {
  const router = Router();

  router.get('/plans', (_req, res) => sendOk(res, PLAN_CATALOG));

  const authed = [deps.authenticate, deps.tenantContext];

  router.post(
    '/create-checkout',
    ...authed,
    isAdmin,
    validateBody(Joi.object({ plan: Joi.string().required() })),
    asyncHandler(async (req, res) => {
      sendOk(res, await uc.crearCheckout.execute(req.tenant!, req.auth!, req.body.plan));
    }),
  );

  router.post(
    '/create-portal',
    ...authed,
    isAdmin,
    asyncHandler(async (req, res) => {
      sendOk(res, await uc.crearPortal.execute(req.tenant!));
    }),
  );

  router.get(
    '/status',
    ...authed,
    asyncHandler(async (req, res) => {
      sendOk(res, await uc.estado.execute(req.tenant!));
    }),
  );

  return router;
}
