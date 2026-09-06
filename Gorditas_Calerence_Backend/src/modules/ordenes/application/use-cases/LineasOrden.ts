import type { UnitOfWork } from '../../../../shared/application/ports/UnitOfWork';
import { NotFoundError } from '../../../../shared/domain/DomainError';
import type { LineaKind, OrdenLineasRepository } from '../ports/OrdenLineasRepository';
import type { OrdenRepository } from '../ports/OrdenRepository';

const NOMBRES: Record<LineaKind, string> = { producto: 'Producto', platillo: 'Platillo', extra: 'Extra' };

export class MarcarLinea {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly lineas: OrdenLineasRepository,
  ) {}

  execute(kind: LineaKind, id: string, flags: Partial<{ listo: boolean; entregado: boolean }>): Promise<void> {
    return this.uow.run(async () => {
      const ok = await this.lineas.updateFlags(kind, id, flags);
      if (!ok) throw new NotFoundError(`${NOMBRES[kind]} no encontrado`, 'LINEA_NOT_FOUND');
    });
  }
}

export class ActualizarNotaPlatillo {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly lineas: OrdenLineasRepository,
  ) {}

  execute(id: string, notas: string | null | undefined): Promise<void> {
    return this.uow.run(async () => {
      const ok = await this.lineas.updatePlatilloNotas(id, notas?.trim() || null);
      if (!ok) throw new NotFoundError('Platillo no encontrado', 'LINEA_NOT_FOUND');
    });
  }
}

export class EliminarLinea {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ordenes: OrdenRepository,
    private readonly lineas: OrdenLineasRepository,
  ) {}

  execute(kind: LineaKind, id: string): Promise<void> {
    return this.uow.run(async () => {
      const idOrden = await this.lineas.ordenIdOf(kind, id);
      if (!idOrden) throw new NotFoundError(`${NOMBRES[kind]} no encontrado`, 'LINEA_NOT_FOUND');
      await this.lineas.deleteLinea(kind, id);
      await this.ordenes.recalcularTotal(idOrden);
    });
  }
}

export class EliminarOrden {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ordenes: OrdenRepository,
  ) {}

  execute(id: string): Promise<void> {
    return this.uow.run(async () => {
      const orden = await this.ordenes.findById(id);
      if (!orden) throw new NotFoundError('Orden no encontrada', 'ORDEN_NOT_FOUND');
      await this.ordenes.delete(orden.id); // cascade en la base
    });
  }
}
