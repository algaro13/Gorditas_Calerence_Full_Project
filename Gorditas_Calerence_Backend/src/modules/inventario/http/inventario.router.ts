import { Router } from 'express';
import Joi from 'joi';
import { asyncHandler } from '../../../shared/http/express/async-handler';
import { isEncargado } from '../../../shared/http/express/authenticate';
import { paginationOf, sendError, sendOk } from '../../../shared/http/express/respond';
import { toApi } from '../../../shared/utils/serialize';
import { validateBody, validateQuery } from '../../../shared/http/express/validate';
import type { AjustarInventario, ConsultarInventario, RecibirProductos } from '../application/use-cases/Inventario';

export interface InventarioUseCases {
  consultar: ConsultarInventario;
  recibir: RecibirProductos;
  ajustar: AjustarInventario;
}

const listQuery = Joi.object({
  tipoProducto: Joi.number().integer().optional(),
  activo: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(20),
});

const recibirSchema = Joi.object({
  productos: Joi.array()
    .items(Joi.object({ idProducto: Joi.number().integer().required(), cantidad: Joi.number().integer().required() }))
    .min(1)
    .required()
    .messages({ 'array.min': 'Debe proporcionar al menos un producto', 'any.required': 'Debe proporcionar al menos un producto' }),
});

const ajustarSchema = Joi.object({
  cantidad: Joi.number().integer().required(),
  motivo: Joi.string().allow('', null).optional(),
});

export function createInventarioRouter(uc: InventarioUseCases): Router {
  const router = Router();

  router.get(
    '/',
    validateQuery(listQuery),
    asyncHandler(async (_req, res) => {
      const q = res.locals.query as { tipoProducto?: number; activo?: boolean; page: number; limit: number };
      const r = await uc.consultar.execute({ idTipoProducto: q.tipoProducto, activo: q.activo }, { skip: (q.page - 1) * q.limit, take: q.limit });
      sendOk(res, { productos: toApi(r.productos), pagination: paginationOf(q.page, q.limit, r.total), resumen: r.resumen });
    }),
  );

  router.post(
    '/recibir',
    isEncargado,
    validateBody(recibirSchema),
    asyncHandler(async (req, res) => {
      const updates = await uc.recibir.execute(req.body.productos);
      sendOk(res, toApi(updates), `${updates.length} productos actualizados exitosamente`);
    }),
  );

  router.put(
    '/ajustar/:id',
    isEncargado,
    validateBody(ajustarSchema),
    asyncHandler(async (req, res) => {
      const id = Number.parseInt(String(req.params.id), 10);
      if (!Number.isInteger(id)) {
        sendError(res, 400, 'Id inválido', 'ID_INVALIDO');
        return;
      }
      const row = await uc.ajustar.execute(id, req.body.cantidad);
      sendOk(res, toApi(row), 'Inventario ajustado exitosamente');
    }),
  );

  return router;
}
