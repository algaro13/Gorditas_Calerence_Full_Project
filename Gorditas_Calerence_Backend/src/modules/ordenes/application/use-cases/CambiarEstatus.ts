import type { Clock } from '../../../../shared/application/ports/Clock';
import type { UnitOfWork } from '../../../../shared/application/ports/UnitOfWork';
import type { Role } from '../../../../shared/domain/Auth';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../../shared/domain/DomainError';
import { canTransition, isOrdenEstatus, type OrdenEstatus } from '../../domain/OrdenStatus';
import type { OrdenCabecera } from '../../domain/types';
import type { OrdenRepository } from '../ports/OrdenRepository';

export class CambiarEstatus {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ordenes: OrdenRepository,
    private readonly clock: Clock,
  ) {}

  execute(id: string, nuevo: unknown, roles: readonly Role[]): Promise<OrdenCabecera> {
    return this.uow.run(async () => {
      if (!isOrdenEstatus(nuevo)) throw new ValidationError('Estatus no válido', 'ESTATUS_INVALIDO');
      const orden = await this.ordenes.findById(id);
      if (!orden) throw new NotFoundError('Orden no encontrada', 'ORDEN_NOT_FOUND');
      if (!canTransition(orden.estatus, nuevo, roles)) {
        throw new ForbiddenError('Transición de estatus no permitida para su rol', 'TRANSICION_NO_PERMITIDA');
      }
      if (nuevo === 'Surtida') await this.ordenes.marcarTodoListo(orden.id);
      return this.ordenes.update(orden.id, {
        estatus: nuevo,
        ...(nuevo === 'Pagada' ? { fechaPago: this.clock.now() } : {}),
      });
    });
  }
}

export class VerificarOrden {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ordenes: OrdenRepository,
  ) {}

  execute(id: string, isComplete: boolean): Promise<{ orden: OrdenCabecera; message: string }> {
    return this.uow.run(async () => {
      const orden = await this.ordenes.findById(id);
      if (!orden) throw new NotFoundError('Orden no encontrada', 'ORDEN_NOT_FOUND');
      if (orden.estatus !== 'Pendiente') throw new ValidationError('Solo se pueden verificar órdenes pendientes', 'NO_PENDIENTE');
      const nuevo: OrdenEstatus = isComplete ? 'Recepcion' : 'Pendiente';
      const actualizada = await this.ordenes.update(orden.id, { estatus: nuevo });
      return {
        orden: actualizada,
        message: isComplete ? 'Orden verificada y enviada a preparación' : 'Orden marcada como pendiente para revisión',
      };
    });
  }
}

export class ActualizarFechaHora {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ordenes: OrdenRepository,
    private readonly clock: Clock,
  ) {}

  execute(id: string, fechaHora?: string | null): Promise<OrdenCabecera> {
    return this.uow.run(async () => {
      const orden = await this.ordenes.findById(id);
      if (!orden) throw new NotFoundError('Orden no encontrada', 'ORDEN_NOT_FOUND');
      const fecha = fechaHora ? new Date(fechaHora) : this.clock.now();
      if (Number.isNaN(fecha.getTime())) throw new ValidationError('Fecha no válida', 'FECHA_INVALIDA');
      return this.ordenes.update(orden.id, { fechaHora: fecha });
    });
  }
}
