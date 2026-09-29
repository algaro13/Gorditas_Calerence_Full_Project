import type { Clock } from '../../../../shared/application/ports/Clock';
import type { UnitOfWork } from '../../../../shared/application/ports/UnitOfWork';
import { NotFoundError, ValidationError } from '../../../../shared/domain/DomainError';
import { estaVigente, evaluarPromociones, type PromocionItem } from '../../domain/evaluar';
import type { NuevaPromocion, PromocionesRepository, PromocionRow } from '../ports/PromocionesRepository';

/**
 * Cada forma solo acepta sus parámetros.
 *
 * El conjunto de formas es cerrado, así que se puede decir exactamente qué necesita cada una en
 * vez de aceptar cualquier combinación y descubrir en la caja que una promoción no descuenta
 * nada.
 */
function exigirParametros(data: NuevaPromocion): void {
  if (data.forma === 'combo') {
    if (data.precio == null || data.precio <= 0) throw new ValidationError('Un combo necesita su precio', 'COMBO_SIN_PRECIO');
    if (!data.items || data.items.length === 0) throw new ValidationError('Un combo necesita los artículos que lo forman', 'COMBO_SIN_ITEMS');
  }
  if (data.forma === 'nxm') {
    const { lleva, paga } = data;
    if (!lleva || !paga || paga >= lleva) {
      throw new ValidationError('En un «lleva N, paga M», M tiene que ser menor que N', 'NXM_INVALIDO');
    }
  }
  if (data.forma === 'porcentaje') {
    if (!data.porcentaje || data.porcentaje <= 0 || data.porcentaje > 100) {
      throw new ValidationError('El porcentaje debe estar entre 1 y 100', 'PORCENTAJE_INVALIDO');
    }
  }
  const hora = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (const h of [data.horaInicio, data.horaFin]) {
    if (h && !hora.test(h)) throw new ValidationError('La hora se escribe como HH:MM', 'HORA_INVALIDA');
  }
  if ((data.horaInicio && !data.horaFin) || (!data.horaInicio && data.horaFin)) {
    throw new ValidationError('Una franja necesita hora de inicio y de fin', 'FRANJA_INCOMPLETA');
  }
  if (data.diasSemana?.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    throw new ValidationError('Los días de la semana van de 0 (domingo) a 6', 'DIA_INVALIDO');
  }
}

export class ListarPromociones {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly repo: PromocionesRepository,
  ) {}
  execute(soloActivas: boolean): Promise<PromocionRow[]> {
    return this.uow.run(() => this.repo.list(soloActivas));
  }
}

export class CrearPromocion {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly repo: PromocionesRepository,
  ) {}
  execute(data: NuevaPromocion): Promise<PromocionRow> {
    exigirParametros(data);
    return this.uow.run(() => this.repo.create(data));
  }
}

export class ActualizarPromocion {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly repo: PromocionesRepository,
  ) {}
  execute(id: number, data: NuevaPromocion): Promise<PromocionRow> {
    exigirParametros(data);
    return this.uow.run(async () => {
      const row = await this.repo.update(id, data);
      if (!row) throw new NotFoundError('Promoción no encontrada', 'PROMOCION_NOT_FOUND');
      return row;
    });
  }
}

export class DesactivarPromocion {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly repo: PromocionesRepository,
  ) {}
  execute(id: number): Promise<void> {
    return this.uow.run(async () => {
      if (!(await this.repo.desactivar(id))) throw new NotFoundError('Promoción no encontrada', 'PROMOCION_NOT_FOUND');
    });
  }
}

/** Lo que quien toma la orden necesita para vender un combo: qué lleva y cuánto cuesta. */
export interface ComboVendible {
  id: number;
  nombre: string;
  precio: number;
  items: PromocionItem[];
}

/**
 * Los combos que se pueden vender ahora mismo, mirado desde el reloj del restaurante.
 *
 * Existe aparte de la lista porque quien toma la orden es el mesero, y la lista completa —con
 * porcentajes, vigencias y promociones desactivadas— es de quien maneja el reporte. Al mesero le
 * basta saber qué combos hay y de qué están hechos: el combo entra en la orden como sus
 * artículos, y el descuento lo decide el servidor al recalcular, como cualquier otro.
 */
export class ListarCombosVigentes {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly repo: PromocionesRepository,
    private readonly clock: Clock,
    private readonly timeZone: string,
  ) {}

  execute(): Promise<ComboVendible[]> {
    return this.uow.run(async () => {
      const ahora = this.clock.now();
      const activas = await this.repo.list(true);
      return activas
        .filter((p) => p.forma === 'combo' && p.precio != null && p.items.length > 0 && estaVigente(p, ahora, this.timeZone))
        .map((p) => ({ id: p.id, nombre: p.nombre, precio: p.precio as number, items: p.items }));
    });
  }
}

/**
 * Rehace los descuentos de una orden desde sus líneas actuales.
 *
 * Corre dentro de la transacción de quien llama —la orden que acaba de cambiar—, así que no
 * abre la suya: si el cambio se deshace, sus descuentos se deshacen con él.
 */
export class RecalcularDescuentos {
  constructor(
    private readonly repo: PromocionesRepository,
    private readonly clock: Clock,
    private readonly timeZone: string,
  ) {}

  async execute(idOrden: string): Promise<void> {
    const [lineas, activas] = await Promise.all([this.repo.lineasDe(idOrden), this.repo.list(true)]);
    const descuentos = evaluarPromociones(lineas, activas, this.clock.now(), this.timeZone);
    await this.repo.reemplazarDescuentos(idOrden, descuentos);
  }
}
