import type { UnitOfWork } from '../../../../shared/application/ports/UnitOfWork';
import { NotFoundError } from '../../../../shared/domain/DomainError';
import type { OrdenCabecera, OrdenConDetalles } from '../../domain/types';
import type { OrdenFilter, OrdenRepository } from '../ports/OrdenRepository';

export class ListarOrdenes {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ordenes: OrdenRepository,
  ) {}

  execute(filter: OrdenFilter, page: { skip: number; take: number }): Promise<{ rows: OrdenCabecera[]; total: number }> {
    return this.uow.run(() => this.ordenes.list(filter, page));
  }
}

export class ObtenerOrden {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ordenes: OrdenRepository,
  ) {}

  execute(id: string): Promise<OrdenConDetalles> {
    return this.uow.run(async () => {
      const orden = await this.ordenes.findTree(id);
      if (!orden) throw new NotFoundError('Orden no encontrada', 'ORDEN_NOT_FOUND');
      return orden;
    });
  }
}
