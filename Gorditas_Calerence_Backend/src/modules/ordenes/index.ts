import type { Router } from 'express';
import type { Clock } from '../../shared/application/ports/Clock';
import type { UnitOfWork } from '../../shared/application/ports/UnitOfWork';
import { AgregarExtra, AgregarPlatillo, AgregarProducto, AgregarSuborden } from './application/use-cases/AgregarLineas';
import { ActualizarFechaHora, CambiarEstatus, VerificarOrden } from './application/use-cases/CambiarEstatus';
import { ListarOrdenes, ObtenerOrden } from './application/use-cases/ConsultarOrdenes';
import { CrearOrden } from './application/use-cases/CrearOrden';
import { ActualizarNotaPlatillo, EliminarLinea, EliminarOrden, MarcarLinea } from './application/use-cases/LineasOrden';
import { createOrdenesRouter, type OrdenesUseCases } from './http/ordenes.router';
import { PrismaCatalogoLookup } from './infrastructure/PrismaCatalogoLookup';
import { PrismaFolioGenerator } from './infrastructure/PrismaFolioGenerator';
import { PrismaOrdenLineasRepository } from './infrastructure/PrismaOrdenLineasRepository';
import { PrismaOrdenRepository } from './infrastructure/PrismaOrdenRepository';
import { PrismaStockRepository } from './infrastructure/PrismaStockRepository';

export interface OrdenesModuleDeps {
  uow: UnitOfWork;
  clock: Clock;
  timeZone: string;
}

export function createOrdenesModule(deps: OrdenesModuleDeps): { router: Router; useCases: OrdenesUseCases } {
  const ordenes = new PrismaOrdenRepository();
  const lineas = new PrismaOrdenLineasRepository();
  const stock = new PrismaStockRepository();
  const catalogo = new PrismaCatalogoLookup();
  const folios = new PrismaFolioGenerator(deps.timeZone);

  const useCases: OrdenesUseCases = {
    listar: new ListarOrdenes(deps.uow, ordenes),
    obtener: new ObtenerOrden(deps.uow, ordenes),
    crear: new CrearOrden(deps.uow, ordenes, catalogo, folios, deps.clock),
    agregarSuborden: new AgregarSuborden(deps.uow, ordenes, lineas),
    agregarPlatillo: new AgregarPlatillo(deps.uow, ordenes, lineas, catalogo),
    agregarProducto: new AgregarProducto(deps.uow, ordenes, lineas, stock, catalogo),
    agregarExtra: new AgregarExtra(deps.uow, ordenes, lineas, catalogo),
    cambiarEstatus: new CambiarEstatus(deps.uow, ordenes, deps.clock),
    verificar: new VerificarOrden(deps.uow, ordenes),
    actualizarFechaHora: new ActualizarFechaHora(deps.uow, ordenes, deps.clock),
    marcarLinea: new MarcarLinea(deps.uow, lineas),
    actualizarNota: new ActualizarNotaPlatillo(deps.uow, lineas),
    eliminarLinea: new EliminarLinea(deps.uow, ordenes, lineas),
    eliminarOrden: new EliminarOrden(deps.uow, ordenes),
  };

  return { router: createOrdenesRouter(useCases, { timeZone: deps.timeZone }), useCases };
}
