import type { Router } from 'express';
import type { UnitOfWork } from '../../shared/application/ports/UnitOfWork';
import { AjustarInventario, ConsultarInventario, RecibirProductos } from './application/use-cases/Inventario';
import { createInventarioRouter } from './http/inventario.router';
import { PrismaInventarioRepository } from './infrastructure/PrismaInventarioRepository';

export function createInventarioModule(deps: { uow: UnitOfWork }): { router: Router } {
  const repo = new PrismaInventarioRepository();
  return {
    router: createInventarioRouter({
      consultar: new ConsultarInventario(deps.uow, repo),
      recibir: new RecibirProductos(deps.uow, repo),
      ajustar: new AjustarInventario(deps.uow, repo),
    }),
  };
}
