import { Router, type RequestHandler } from 'express';
import { asyncHandler } from '../../../shared/http/express/async-handler';
import { soloPlataforma } from '../../../shared/http/express/authenticate';
import { sendOk } from '../../../shared/http/express/respond';
import type { ResumenPlataforma } from '../application/ResumenPlataforma';

/**
 * Consola de plataforma. Va sin `tenantContext`: el operador no es miembro de ningún restaurante,
 * y por eso tampoco pasa por el guard de plan ni por la verificación de correo de los restaurantes.
 */
export function createPlataformaRouter(deps: { resumen: ResumenPlataforma; authenticate: RequestHandler; platformOrgId: string }): Router {
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

  return router;
}
