import type { Clock } from '../../../../shared/application/ports/Clock';
import type { UnitOfWork } from '../../../../shared/application/ports/UnitOfWork';
import { NotFoundError, ValidationError } from '../../../../shared/domain/DomainError';
import type { GastoRow, GastosReporte, Rango, ReportesQuery, VentasReporte } from '../ports/ReportesQuery';

const LONG_TX = { timeoutMs: 30_000 };

export class ReporteVentas {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly q: ReportesQuery,
  ) {}
  execute(rango: Rango | null): Promise<VentasReporte> {
    return this.uow.run(() => this.q.ventas(rango), LONG_TX);
  }
}

export class ReporteInventario {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly q: ReportesQuery,
  ) {}
  execute() {
    return this.uow.run(async () => {
      const productos = (await this.q.inventario()) as Array<{ cantidad: number; costo: number }>;
      const resumen = {
        totalProductos: productos.length,
        stockBajo: productos.filter((p) => p.cantidad <= 5 && p.cantidad > 0).length,
        stockAgotado: productos.filter((p) => p.cantidad === 0).length,
        valorInventario: Math.round(productos.reduce((t, p) => t + p.cantidad * p.costo, 0) * 100) / 100,
      };
      return {
        productos,
        resumen,
        alertas: { stockBajo: productos.filter((p) => p.cantidad <= 5), stockAlto: productos.filter((p) => p.cantidad > 50) },
      };
    }, LONG_TX);
  }
}

export class ReporteGastos {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly q: ReportesQuery,
  ) {}
  execute(filter: { rango: Rango | null; idTipoGasto?: number }): Promise<GastosReporte> {
    return this.uow.run(() => this.q.gastos(filter), LONG_TX);
  }
}

export class CrearGasto {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly q: ReportesQuery,
    private readonly clock: Clock,
  ) {}
  execute(input: { nombre: string; idTipoGasto: number; gastoTotal: number; descripcion?: string | null; fecha?: Date }): Promise<GastoRow> {
    return this.uow.run(async () => {
      const row = await this.q.crearGasto({
        nombre: input.nombre.trim(),
        idTipoGasto: input.idTipoGasto,
        gastoTotal: input.gastoTotal,
        descripcion: input.descripcion?.trim() ?? '',
        fecha: input.fecha ?? this.clock.now(),
      });
      if (!row) throw new ValidationError('Tipo de gasto no encontrado', 'TIPO_GASTO_INVALIDO');
      return row;
    });
  }
}

export class EliminarGasto {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly q: ReportesQuery,
  ) {}
  execute(id: number): Promise<void> {
    return this.uow.run(async () => {
      if (!(await this.q.eliminarGasto(id))) throw new NotFoundError('Gasto no encontrado', 'GASTO_NOT_FOUND');
    });
  }
}

export class ProductosMasVendidos {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly q: ReportesQuery,
  ) {}
  execute(rango: Rango | null, limit: number) {
    return this.uow.run(() => this.q.productosVendidos(rango, limit), LONG_TX);
  }
}
