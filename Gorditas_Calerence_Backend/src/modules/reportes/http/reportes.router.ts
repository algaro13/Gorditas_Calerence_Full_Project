import { Router } from 'express';
import Joi from 'joi';
import { asyncHandler } from '../../../shared/http/express/async-handler';
import { isEncargado } from '../../../shared/http/express/authenticate';
import { sendCreated, sendError, sendOk } from '../../../shared/http/express/respond';
import { toApi } from '../../../shared/utils/serialize';
import { validateBody, validateQuery } from '../../../shared/http/express/validate';
import { dayRange } from '../../../shared/utils/dates';
import type { CrearGasto, EliminarGasto, ProductosMasVendidos, ReporteGastos, ReporteInventario, ReporteVentas } from '../application/use-cases/Reportes';
import type { Rango } from '../application/ports/ReportesQuery';

export interface ReportesUseCases {
  ventas: ReporteVentas;
  inventario: ReporteInventario;
  gastos: ReporteGastos;
  crearGasto: CrearGasto;
  eliminarGasto: EliminarGasto;
  masVendidos: ProductosMasVendidos;
}

const dateKey = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);
const rangoQuery = {
  fechaInicio: dateKey.optional(),
  fechaFin: dateKey.optional(),
};

const crearGastoSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(120).required(),
  idTipoGasto: Joi.number().integer().required(),
  gastoTotal: Joi.number().min(0).required(),
  descripcion: Joi.string().max(500).allow('', null).optional(),
  fecha: Joi.date().iso().optional(),
});

export function createReportesRouter(uc: ReportesUseCases, opts: { timeZone: string }): Router {
  const router = Router();
  router.use(isEncargado);

  const rangoDe = (q: { fechaInicio?: string; fechaFin?: string }): Rango | null =>
    q.fechaInicio && q.fechaFin ? dayRange(q.fechaInicio, q.fechaFin, opts.timeZone) : null;

  router.get(
    '/ventas',
    validateQuery(Joi.object(rangoQuery)),
    asyncHandler(async (_req, res) => {
      const r = await uc.ventas.execute(rangoDe(res.locals.query));
      sendOk(res, {
        ordenes: r.ordenes,
        productos: r.productos,
        platillos: r.platillos,
        extras: r.extras,
        pagination: { total: r.total },
        resumen: r.resumen,
        ventasPorDia: r.ventasPorDia,
        ventasPorTipo: r.ventasPorTipo,
        ordenesPagadas: r.ordenesPagadas,
      });
    }),
  );

  router.get(
    '/inventario',
    asyncHandler(async (_req, res) => {
      sendOk(res, await uc.inventario.execute());
    }),
  );

  router.get(
    '/gastos',
    validateQuery(Joi.object({ ...rangoQuery, tipoGasto: Joi.number().integer().optional() })),
    asyncHandler(async (_req, res) => {
      const q = res.locals.query as { fechaInicio?: string; fechaFin?: string; tipoGasto?: number };
      const r = await uc.gastos.execute({ rango: rangoDe(q), idTipoGasto: q.tipoGasto });
      sendOk(res, { gastos: toApi(r.gastos), resumen: r.resumen, gastosPorTipo: r.gastosPorTipo, gastosPorDia: r.gastosPorDia });
    }),
  );

  router.post(
    '/gastos',
    validateBody(crearGastoSchema, { stripUnknown: true }),
    asyncHandler(async (req, res) => {
      const g = await uc.crearGasto.execute(req.body);
      sendCreated(res, toApi(g), 'Gasto creado exitosamente');
    }),
  );

  router.delete(
    '/gastos/:id',
    asyncHandler(async (req, res) => {
      const id = Number.parseInt(String(req.params.id), 10);
      if (!Number.isInteger(id)) {
        sendError(res, 400, 'Id inválido', 'ID_INVALIDO');
        return;
      }
      await uc.eliminarGasto.execute(id);
      sendOk(res, null, 'Gasto eliminado exitosamente');
    }),
  );

  router.get(
    '/productos-vendidos',
    validateQuery(Joi.object({ ...rangoQuery, limit: Joi.number().integer().min(1).max(100).default(10) })),
    asyncHandler(async (_req, res) => {
      const q = res.locals.query as { fechaInicio?: string; fechaFin?: string; limit: number };
      sendOk(res, await uc.masVendidos.execute(rangoDe(q), q.limit));
    }),
  );

  return router;
}
