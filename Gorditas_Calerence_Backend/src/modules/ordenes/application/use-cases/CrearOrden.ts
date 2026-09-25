import type { Clock } from '../../../../shared/application/ports/Clock';
import type { UnitOfWork } from '../../../../shared/application/ports/UnitOfWork';
import { ValidationError } from '../../../../shared/domain/DomainError';
import type { OrdenEstatus } from '../../domain/OrdenStatus';
import type { OrdenCabecera } from '../../domain/types';
import type { CatalogoLookup } from '../ports/CatalogoLookup';
import type { FolioGenerator } from '../ports/FolioGenerator';
import type { OrdenRepository } from '../ports/OrdenRepository';

export interface CrearOrdenInput {
  /** Opcional: sin él se usa el tipo por omisión del restaurante. Ver `execute`. */
  idTipoOrden?: number | null;
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
      // Los ids de catálogo se generan por restaurante, así que un cliente no puede asumir
      // ninguno: la pantalla de tomar órdenes mandaba un 1 fijo y fallaba en todo restaurante
      // que no fuera el primero dado de alta. Si no viene tipo, lo resuelve el servidor.
      let tipoOrden;
      if (input.idTipoOrden !== undefined && input.idTipoOrden !== null) {
        tipoOrden = await this.catalogo.tipoOrden(input.idTipoOrden);
        // Sigue rechazándose un id que no pertenece a este restaurante: eso es aislamiento.
        if (!tipoOrden) throw new ValidationError('Tipo de orden no válido', 'TIPO_ORDEN_INVALIDO');
      } else {
        tipoOrden = await this.catalogo.tipoOrdenPorOmision();
        // Se distingue del caso anterior a propósito: «tipo no válido» mandaría a revisar lo
        // que se envió, cuando lo que falta es dar de alta el catálogo.
        if (!tipoOrden) {
          throw new ValidationError(
            'El restaurante no tiene tipos de orden activos. Da de alta al menos uno en Catálogos.',
            'SIN_TIPOS_DE_ORDEN',
          );
        }
      }

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
