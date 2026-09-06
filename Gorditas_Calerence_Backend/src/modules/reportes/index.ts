import type { Router } from 'express';
import type { Clock } from '../../shared/application/ports/Clock';
import type { UnitOfWork } from '../../shared/application/ports/UnitOfWork';
import { CrearGasto, EliminarGasto, ProductosMasVendidos, ReporteGastos, ReporteInventario, ReporteVentas } from './application/use-cases/Reportes';
import { createReportesRouter } from './http/reportes.router';
import { PrismaReportesQuery } from './infrastructure/PrismaReportesQuery';

export function createReportesModule(deps: { uow: UnitOfWork; clock: Clock; timeZone: string }): { router: Router } {
  const q = new PrismaReportesQuery(deps.timeZone);
  return {
    router: createReportesRouter(
      {
        ventas: new ReporteVentas(deps.uow, q),
        inventario: new ReporteInventario(deps.uow, q),
        gastos: new ReporteGastos(deps.uow, q),
        crearGasto: new CrearGasto(deps.uow, q, deps.clock),
        eliminarGasto: new EliminarGasto(deps.uow, q),
        masVendidos: new ProductosMasVendidos(deps.uow, q),
      },
      { timeZone: deps.timeZone },
    ),
  };
}
