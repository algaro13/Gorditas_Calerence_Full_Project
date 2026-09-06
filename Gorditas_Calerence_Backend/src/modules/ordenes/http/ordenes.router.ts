import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/express/async-handler';
import { isMesero } from '../../../shared/http/express/authenticate';
import { paginationOf, sendCreated, sendOk } from '../../../shared/http/express/respond';
import { toApi } from '../../../shared/utils/serialize';
import { validateBody, validateQuery } from '../../../shared/http/express/validate';
import { dayRange } from '../../../shared/utils/dates';
import { isOrdenEstatus, type OrdenEstatus } from '../domain/OrdenStatus';
import type { AgregarExtra, AgregarPlatillo, AgregarProducto, AgregarSuborden } from '../application/use-cases/AgregarLineas';
import type { ActualizarFechaHora, CambiarEstatus, VerificarOrden } from '../application/use-cases/CambiarEstatus';
import type { ListarOrdenes, ObtenerOrden } from '../application/use-cases/ConsultarOrdenes';
import type { CrearOrden } from '../application/use-cases/CrearOrden';
import type { ActualizarNotaPlatillo, EliminarLinea, EliminarOrden, MarcarLinea } from '../application/use-cases/LineasOrden';
import type { LineaKind } from '../application/ports/OrdenLineasRepository';
import * as S from './ordenes.schemas';

export interface OrdenesUseCases {
  listar: ListarOrdenes;
  obtener: ObtenerOrden;
  crear: CrearOrden;
  agregarSuborden: AgregarSuborden;
  agregarPlatillo: AgregarPlatillo;
  agregarProducto: AgregarProducto;
  agregarExtra: AgregarExtra;
  cambiarEstatus: CambiarEstatus;
  verificar: VerificarOrden;
  actualizarFechaHora: ActualizarFechaHora;
  marcarLinea: MarcarLinea;
  actualizarNota: ActualizarNotaPlatillo;
  eliminarLinea: EliminarLinea;
  eliminarOrden: EliminarOrden;
}

export function createOrdenesRouter(uc: OrdenesUseCases, opts: { timeZone: string }): Router {
  const router = Router();

  router.get(
    '/',
    validateQuery(S.listarQuerySchema),
    asyncHandler(async (_req, res) => {
      const q = res.locals.query as { estatus?: OrdenEstatus; estatusNo?: string; mesa?: number; fecha?: string; page: number; limit: number };
      const estatusNo = q.estatusNo
        ? q.estatusNo
            .split(',')
            .map((s) => s.trim())
            .filter(isOrdenEstatus)
        : undefined;
      const { rows, total } = await uc.listar.execute(
        {
          estatus: q.estatus,
          estatusNo,
          idMesa: q.mesa,
          rango: q.fecha ? dayRange(q.fecha, q.fecha, opts.timeZone) : undefined,
        },
        { skip: (q.page - 1) * q.limit, take: q.limit },
      );
      sendOk(res, { ordenes: toApi(rows), pagination: paginationOf(q.page, q.limit, total) });
    }),
  );

  router.post(
    '/nueva',
    validateBody(S.crearOrdenSchema),
    asyncHandler(async (req, res) => {
      const b = req.body;
      const orden = await uc.crear.execute({
        idTipoOrden: b.idTipoOrden,
        idMesa: b.idMesa ?? null,
        nombreCliente: b.nombreCliente ?? null,
        notas: b.notas ?? null,
        estatus: isOrdenEstatus(b.estatus) ? b.estatus : undefined,
      });
      sendCreated(res, toApi(orden), 'Orden creada exitosamente');
    }),
  );

  // Rutas de líneas (antes de '/:id' para que no las capture el parámetro)
  router.post(
    '/suborden/:id/platillo',
    validateBody(S.agregarPlatilloSchema),
    asyncHandler(async (req, res) => {
      const linea = await uc.agregarPlatillo.execute(req.params.id, req.body);
      sendCreated(res, toApi(linea), 'Platillo agregado exitosamente');
    }),
  );

  router.post(
    '/platillo/:id/extra',
    validateBody(S.agregarExtraSchema),
    asyncHandler(async (req, res) => {
      const linea = await uc.agregarExtra.execute(req.params.id, req.body);
      sendCreated(res, toApi(linea), 'Extra agregado exitosamente');
    }),
  );

  for (const kind of ['producto', 'platillo', 'extra'] as LineaKind[]) {
    const label = kind.charAt(0).toUpperCase() + kind.slice(1);
    router.put(
      `/${kind}/:id/listo`,
      asyncHandler(async (req, res) => {
        await uc.marcarLinea.execute(kind, req.params.id, { listo: true });
        sendOk(res, null, `${label} marcado como listo`);
      }),
    );
    router.put(
      `/${kind}/:id/entregado`,
      asyncHandler(async (req, res) => {
        await uc.marcarLinea.execute(kind, req.params.id, { entregado: true });
        sendOk(res, null, `${label} marcado como entregado`);
      }),
    );
    router.delete(
      `/${kind}/:id`,
      asyncHandler(async (req, res) => {
        await uc.eliminarLinea.execute(kind, req.params.id);
        sendOk(res, null, `${label} eliminado exitosamente`);
      }),
    );
  }

  router.put(
    '/extra/:id/estatus',
    validateBody(S.extraEstatusSchema),
    asyncHandler(async (req, res) => {
      await uc.marcarLinea.execute('extra', req.params.id, { entregado: req.body.estatus === 'entregado' });
      sendOk(res, null, 'Estatus del extra actualizado');
    }),
  );

  router.put(
    '/platillo/:id/nota',
    validateBody(S.notaSchema),
    asyncHandler(async (req, res) => {
      await uc.actualizarNota.execute(req.params.id, req.body.notas);
      sendOk(res, null, 'Nota del platillo actualizada exitosamente');
    }),
  );

  // Rutas por orden
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const orden = await uc.obtener.execute(req.params.id);
      sendOk(res, toApi(orden));
    }),
  );

  router.post(
    '/:id/suborden',
    validateBody(S.subordenSchema),
    asyncHandler(async (req, res) => {
      const suborden = await uc.agregarSuborden.execute(req.params.id, req.body.nombre);
      sendCreated(res, toApi(suborden), 'Suborden creada exitosamente');
    }),
  );

  router.post(
    '/:id/producto',
    validateBody(S.agregarProductoSchema),
    asyncHandler(async (req, res) => {
      const linea = await uc.agregarProducto.execute(req.params.id, req.body);
      sendCreated(res, toApi(linea), 'Producto agregado exitosamente');
    }),
  );

  router.put(
    '/:id/estatus',
    validateBody(S.cambiarEstatusSchema),
    asyncHandler(async (req, res) => {
      const orden = await uc.cambiarEstatus.execute(req.params.id, req.body.estatus, req.auth!.roles);
      sendOk(res, toApi(orden), 'Estatus actualizado exitosamente');
    }),
  );

  router.put(
    '/:id/fecha-hora',
    validateBody(S.fechaHoraSchema),
    asyncHandler(async (req, res) => {
      const orden = await uc.actualizarFechaHora.execute(req.params.id, req.body.fechaHora);
      sendOk(res, toApi(orden), 'Fecha y hora actualizada exitosamente');
    }),
  );

  router.put(
    '/:id/verificar',
    isMesero,
    validateBody(S.verificarSchema),
    asyncHandler(async (req, res) => {
      const { orden, message } = await uc.verificar.execute(req.params.id, req.body.isComplete);
      sendOk(res, toApi(orden), message);
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      await uc.eliminarOrden.execute(req.params.id);
      sendOk(res, null, 'Orden eliminada exitosamente');
    }),
  );

  return router;
}
