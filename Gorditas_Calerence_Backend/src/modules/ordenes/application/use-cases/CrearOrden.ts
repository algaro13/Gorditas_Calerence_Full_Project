import type { Clock } from '../../../../shared/application/ports/Clock';
import type { UnitOfWork } from '../../../../shared/application/ports/UnitOfWork';
import { ValidationError } from '../../../../shared/domain/DomainError';
import type { OrdenEstatus } from '../../domain/OrdenStatus';
import type { OrdenCabecera } from '../../domain/types';
import type { CatalogoLookup } from '../ports/CatalogoLookup';
import type { FolioGenerator } from '../ports/FolioGenerator';
import type { OrdenRepository } from '../ports/OrdenRepository';

export interface CrearOrdenInput {
  idTipoOrden: number;
  idMesa?: number | null;
  nombreCliente?: string | null;
  notas?: string | null;
  estatus?: OrdenEstatus;
}

export class CrearOrden {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ordenes: OrdenRepository,
    private readonly catalogo: CatalogoLookup,
    private readonly folios: FolioGenerator,
    private readonly clock: Clock,
  ) {}

  execute(input: CrearOrdenInput): Promise<OrdenCabecera> {
    return this.uow.run(async () => {
      const tipoOrden = await this.catalogo.tipoOrden(input.idTipoOrden);
      if (!tipoOrden) throw new ValidationError('Tipo de orden no válido', 'TIPO_ORDEN_INVALIDO');

      let mesa = null;
      if (input.idMesa !== undefined && input.idMesa !== null) {
        mesa = await this.catalogo.mesa(input.idMesa);
        if (!mesa) throw new ValidationError('Mesa no válida', 'MESA_INVALIDA');
      }

      const folio = await this.folios.next(this.clock.now());
      return this.ordenes.create({
        folio,
        idTipoOrden: tipoOrden.id,
        nombreTipoOrden: tipoOrden.nombre,
        estatus: input.estatus ?? 'Recepcion',
        idMesa: mesa?.id ?? null,
        nombreMesa: mesa?.nombre ?? null,
        nombreCliente: input.nombreCliente?.trim() || null,
        notas: input.notas?.trim() || null,
        total: 0,
      });
    });
  }
}
