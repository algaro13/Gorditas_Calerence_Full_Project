import type { Router } from 'express';
import type { UnitOfWork } from '../../shared/application/ports/UnitOfWork';
import { ActualizarRegistro, CrearRegistro, EliminarRegistro, ListarCatalogo } from './application/use-cases/CatalogoCrud';
import { createCatalogosRouter, type CatalogosRouterDeps } from './http/catalogos.router';
import { PrismaCatalogoRepository } from './infrastructure/PrismaCatalogoRepository';

export function createCatalogosModule(deps: { uow: UnitOfWork } & CatalogosRouterDeps): { router: Router } {
  const repo = new PrismaCatalogoRepository();
  const router = createCatalogosRouter(
    {
      listar: new ListarCatalogo(deps.uow, repo),
      crear: new CrearRegistro(deps.uow, repo),
      actualizar: new ActualizarRegistro(deps.uow, repo),
      eliminar: new EliminarRegistro(deps.uow, repo),
    },
    deps,
  );
  return { router };
}
