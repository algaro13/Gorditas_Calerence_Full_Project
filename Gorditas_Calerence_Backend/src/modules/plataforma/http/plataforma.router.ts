import { Router, type RequestHandler } from 'express';
import Joi from 'joi';
import { asyncHandler } from '../../../shared/http/express/async-handler';
import { soloPlataforma } from '../../../shared/http/express/authenticate';
import { sendOk } from '../../../shared/http/express/respond';
import { validateBody } from '../../../shared/http/express/validate';
import type { ResumenPlataforma } from '../application/ResumenPlataforma';
import type { GestionRetencion } from '../application/Retencion';

const pausaSchema = Joi.object({ pausada: Joi.boolean().required() });
const borrarSchema = Joi.object({ confirmacion: Joi.string().max(100).required() });

/**
 * Consola de plataforma. Va sin `tenantContext`: el operador no es miembro de ningún restaurante,
 * y por eso tampoco pasa por el guard de plan ni por la verificación de correo de los restaurantes.
 */
export function createPlataformaRouter(deps: {
  resumen: ResumenPlataforma;
  retencion: GestionRetencion;
  authenticate: RequestHandler;
  platformOrgId: string;
}): Router {
  const router = Router();

  // Público: la organización con la que el SPA inicia sesión como operador. No es un secreto; sin
  // el rol en esa organización, el token que se obtenga no abre la consola.
  router.get('/acceso', (_req, res) => sendOk(res, { orgId: deps.platformOrgId }));

  router.get(
    '/resumen',
    deps.authenticate,
    soloPlataforma,
    asyncHandler(async (req, res) => {
      sendOk(res, await deps.resumen.ejecutar(req.auth!));
    }),
  );

  router.post(
    '/restaurantes/:id/restaurar',
    deps.authenticate,
    soloPlataforma,
    asyncHandler(async (req, res) => {
      await deps.retencion.restaurar(req.auth!, String(req.params.id));
      sendOk(res, { restaurado: true });
    }),
  );

  router.post(
    '/restaurantes/:id/pausa',
    deps.authenticate,
    soloPlataforma,
    validateBody(pausaSchema),
    asyncHandler(async (req, res) => {
      await deps.retencion.pausar(req.auth!, String(req.params.id), req.body.pausada);
      sendOk(res, { pausada: req.body.pausada });
    }),
  );

  router.post(
    '/restaurantes/:id/borrar',
    deps.authenticate,
    soloPlataforma,
    validateBody(borrarSchema),
    asyncHandler(async (req, res) => {
      await deps.retencion.borrar(req.auth!, String(req.params.id), req.body.confirmacion);
      sendOk(res, { borrado: true });
    }),
  );

  return router;
}
