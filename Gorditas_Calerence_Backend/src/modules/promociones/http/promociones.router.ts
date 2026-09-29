import { Router } from 'express';
import Joi from 'joi';
import { asyncHandler } from '../../../shared/http/express/async-handler';
import { isAdmin, isEncargado, isMesero } from '../../../shared/http/express/authenticate';
import { sendCreated, sendError, sendOk } from '../../../shared/http/express/respond';
import { validateBody } from '../../../shared/http/express/validate';
import type {
  ActualizarPromocion,
  CrearPromocion,
  DesactivarPromocion,
  ListarCombosVigentes,
  ListarPromociones,
} from '../application/use-cases/Promociones';

export interface PromocionesUseCases {
  listar: ListarPromociones;
  crear: CrearPromocion;
  actualizar: ActualizarPromocion;
  desactivar: DesactivarPromocion;
  combos: ListarCombosVigentes;
}

const hora = Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/);

/**
 * El cuerpo acepta los parámetros de las tres formas, y cada forma exige los suyos en el caso de
 * uso. Se valida ahí y no aquí porque es una regla del negocio —qué necesita un combo— y no de
 * la forma del JSON.
 */
const promocionSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(120).required(),
  forma: Joi.string().valid('combo', 'nxm', 'porcentaje').required(),
  activo: Joi.boolean().optional(),
  combinable: Joi.boolean().optional(),
  precio: Joi.number().min(0).allow(null).optional(),
  lleva: Joi.number().integer().min(2).allow(null).optional(),
  paga: Joi.number().integer().min(1).allow(null).optional(),
  porcentaje: Joi.number().min(0).max(100).allow(null).optional(),
  idTipoPlatillo: Joi.number().integer().allow(null).optional(),
  desde: Joi.date().iso().allow(null).optional(),
  hasta: Joi.date().iso().allow(null).optional(),
  diasSemana: Joi.array().items(Joi.number().integer().min(0).max(6)).optional(),
  horaInicio: hora.allow(null, '').optional(),
  horaFin: hora.allow(null, '').optional(),
  items: Joi.array()
    .items(
      Joi.object({
        idPlatillo: Joi.number().integer().allow(null).optional(),
        idProducto: Joi.number().integer().allow(null).optional(),
        cantidad: Joi.number().integer().min(1).default(1),
      }).or('idPlatillo', 'idProducto'),
    )
    .optional(),
});

export function createPromocionesRouter(uc: PromocionesUseCases): Router {
  const router = Router();

  // Leerlas basta con Encargado —quien toma la orden ve qué promociones hay—, pero escribirlas
  // cambia lo que se cobra, así que es cosa del Admin.
  router.get(
    '/',
    isEncargado,
    asyncHandler(async (req, res) => {
      sendOk(res, { promociones: await uc.listar.execute(req.query.activas === 'true') });
    }),
  );

  // Lo que el mesero sí ve: los combos que puede vender ahora, y de qué están hechos. Va antes
  // de '/:id' y no le da la lista completa, que sigue siendo de quien maneja el reporte.
  router.get(
    '/combos',
    isMesero,
    asyncHandler(async (_req, res) => {
      sendOk(res, { combos: await uc.combos.execute() });
    }),
  );

  router.post(
    '/',
    isAdmin,
    validateBody(promocionSchema, { stripUnknown: true }),
    asyncHandler(async (req, res) => {
      sendCreated(res, await uc.crear.execute(req.body), 'Promoción creada');
    }),
  );

  router.put(
    '/:id',
    isAdmin,
    validateBody(promocionSchema, { stripUnknown: true }),
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return sendError(res, 400, 'Identificador inválido', 'ID_INVALIDO');
      sendOk(res, await uc.actualizar.execute(id, req.body), 'Promoción actualizada');
    }),
  );

  // Desactiva, no borra: una promoción que ya se aplicó sigue explicando los descuentos que dio.
  router.delete(
    '/:id',
    isAdmin,
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return sendError(res, 400, 'Identificador inválido', 'ID_INVALIDO');
      await uc.desactivar.execute(id);
      sendOk(res, { id }, 'Promoción desactivada');
    }),
  );

  return router;
}
