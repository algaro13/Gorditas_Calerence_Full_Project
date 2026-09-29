import type { Router } from 'express';
import type { Clock } from '../../shared/application/ports/Clock';
import type { UnitOfWork } from '../../shared/application/ports/UnitOfWork';
import {
  ActualizarPromocion,
  CrearPromocion,
  DesactivarPromocion,
  ListarCombosVigentes,
  ListarPromociones,
  RecalcularDescuentos,
} from './application/use-cases/Promociones';
import { createPromocionesRouter } from './http/promociones.router';
import { PrismaPromocionesRepository } from './infrastructure/PrismaPromocionesRepository';

export function createPromocionesModule(deps: { uow: UnitOfWork; clock: Clock; timeZone: string }): {
  router: Router;
  recalcularDescuentos: RecalcularDescuentos;
} {
  const repo = new PrismaPromocionesRepository();
  return {
    router: createPromocionesRouter({
      listar: new ListarPromociones(deps.uow, repo),
      crear: new CrearPromocion(deps.uow, repo),
      actualizar: new ActualizarPromocion(deps.uow, repo),
      desactivar: new DesactivarPromocion(deps.uow, repo),
      combos: new ListarCombosVigentes(deps.uow, repo, deps.clock, deps.timeZone),
    }),
    recalcularDescuentos: new RecalcularDescuentos(repo, deps.clock, deps.timeZone),
  };
}
