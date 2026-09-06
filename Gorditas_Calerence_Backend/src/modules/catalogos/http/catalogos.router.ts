import { Router, type Request, type Response } from 'express';
import Joi from 'joi';
import { asyncHandler } from '../../../shared/http/express/async-handler';
import { paginationOf, sendCreated, sendError, sendOk } from '../../../shared/http/express/respond';
import { toApi } from '../../../shared/http/express/serialize';
import { validateQuery } from '../../../shared/http/express/validate';
import { ROLES } from '../../../shared/domain/Auth';
import type { ActualizarRegistro, CrearRegistro, EliminarRegistro, ListarCatalogo } from '../application/use-cases/CatalogoCrud';
import { resolveCatalogo, updateSchemaOf, type CatalogoDef } from '../domain/registry';

export interface CatalogosUseCases {
  listar: ListarCatalogo;
  crear: CrearRegistro;
  actualizar: ActualizarRegistro;
  eliminar: EliminarRegistro;
}

export interface CatalogosRouterDeps {
  nextPedidoNumber: () => Promise<number>;
  listarPersonal: () => Promise<Array<{ id: string; nombre: string; email: string; role: string; activo: boolean }>>;
}

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(20),
  activo: Joi.boolean().optional(),
  search: Joi.string().trim().allow('').optional(),
});

function validateBodyWith(schema: Joi.ObjectSchema, body: unknown, res: Response): Record<string, unknown> | null {
  const { error, value } = schema.validate(body ?? {}, { abortEarly: false, stripUnknown: true, convert: true });
  if (error) {
    sendError(res, 400, 'Datos inválidos', 'VALIDATION', error.details.map((d) => d.message));
    return null;
  }
  return value as Record<string, unknown>;
}

function defOr400(req: Request, res: Response): CatalogoDef | null {
  const def = resolveCatalogo(String(req.params.modelo));
  if (!def) sendError(res, 400, 'Modelo no válido', 'MODELO_INVALIDO');
  return def;
}

const USUARIOS_MSG = 'Los usuarios se administran en /api/usuarios';

export function createCatalogosRouter(uc: CatalogosUseCases, deps: CatalogosRouterDeps): Router {
  const router = Router();

  router.get(
    '/pedido/next-number',
    asyncHandler(async (_req, res) => {
      sendOk(res, { nextNumber: await deps.nextPedidoNumber() }, 'Siguiente número de pedido obtenido');
    }),
  );

  // Lista fija de roles (antes tabla tipousuario)
  router.get(['/tipousuario', '/tipo-usuario'], (_req, res) => {
    const items = ROLES.map((nombre, i) => ({ _id: i + 1, nombre, descripcion: '', activo: true }));
    sendOk(res, { items, pagination: paginationOf(1, items.length, items.length) });
  });

  // Compatibilidad de lectura con el catálogo de usuarios anterior
  router.get(
    '/usuario',
    asyncHandler(async (_req, res) => {
      const personal = await deps.listarPersonal();
      const items = personal.map((u) => ({ _id: u.id, nombre: u.nombre, email: u.email, nombreTipoUsuario: u.role, activo: u.activo }));
      sendOk(res, { items, pagination: paginationOf(1, items.length, items.length) });
    }),
  );
  router.all(['/usuario', '/usuario/:id'], (_req, res) => sendError(res, 400, USUARIOS_MSG, 'USE_USUARIOS_API'));

  router.get(
    '/:modelo',
    validateQuery(listQuery),
    asyncHandler(async (req, res) => {
      const def = defOr400(req, res);
      if (!def) return;
      const q = res.locals.query as { page: number; limit: number; activo?: boolean; search?: string };
      const { rows, total } = await uc.listar.execute(def, { activo: q.activo, search: q.search || undefined }, { skip: (q.page - 1) * q.limit, take: q.limit });
      sendOk(res, { items: toApi(rows, def.flatten), pagination: paginationOf(q.page, q.limit, total) });
    }),
  );

  router.post(
    '/:modelo',
    asyncHandler(async (req, res) => {
      const def = defOr400(req, res);
      if (!def) return;
      const data = validateBodyWith(def.createSchema, req.body, res);
      if (!data) return;
      const row = await uc.crear.execute(def, data);
      sendCreated(res, toApi(row, def.flatten), 'Registro creado exitosamente');
    }),
  );

  router.put(
    '/:modelo/:id',
    asyncHandler(async (req, res) => {
      const def = defOr400(req, res);
      if (!def) return;
      const id = Number.parseInt(String(req.params.id), 10);
      if (!Number.isInteger(id)) {
        sendError(res, 400, 'Id inválido', 'ID_INVALIDO');
        return;
      }
      const data = validateBodyWith(updateSchemaOf(def), req.body, res);
      if (!data) return;
      const row = await uc.actualizar.execute(def, id, data);
      sendOk(res, toApi(row, def.flatten), 'Registro actualizado exitosamente');
    }),
  );

  router.delete(
    '/:modelo/:id',
    asyncHandler(async (req, res) => {
      const def = defOr400(req, res);
      if (!def) return;
      const id = Number.parseInt(String(req.params.id), 10);
      if (!Number.isInteger(id)) {
        sendError(res, 400, 'Id inválido', 'ID_INVALIDO');
        return;
      }
      await uc.eliminar.execute(def, id);
      sendOk(res, null, 'Registro eliminado exitosamente');
    }),
  );

  return router;
}
