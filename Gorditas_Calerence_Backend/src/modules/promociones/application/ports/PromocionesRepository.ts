import type { LineaEvaluable, PromocionEvaluable } from '../../domain/evaluar';

/** Una promoción tal y como se guarda y se edita. */
export interface PromocionRow extends PromocionEvaluable {
  createdAt: Date;
}

export interface NuevaPromocion {
  nombre: string;
  forma: PromocionEvaluable['forma'];
  activo?: boolean;
  combinable?: boolean;
  precio?: number | null;
  lleva?: number | null;
  paga?: number | null;
  porcentaje?: number | null;
  idTipoPlatillo?: number | null;
  desde?: Date | null;
  hasta?: Date | null;
  diasSemana?: number[];
  horaInicio?: string | null;
  horaFin?: string | null;
  items?: Array<{ idPlatillo?: number | null; idProducto?: number | null; cantidad: number }>;
}

export interface PromocionesRepository {
  list(soloActivas: boolean): Promise<PromocionRow[]>;
  findById(id: number): Promise<PromocionRow | null>;
  create(data: NuevaPromocion): Promise<PromocionRow>;
  update(id: number, data: NuevaPromocion): Promise<PromocionRow | null>;
  /** Desactiva: una promoción que ya se aplicó no se borra, o sus órdenes perderían el porqué. */
  desactivar(id: number): Promise<boolean>;

  /** Las líneas de una orden, reducidas a lo que las reglas miran. */
  lineasDe(idOrden: string): Promise<LineaEvaluable[]>;
  /** Reemplaza los descuentos de una orden por los recién calculados. */
  reemplazarDescuentos(
    idOrden: string,
    descuentos: Array<{ idPromocion: number; nombre: string; importe: number }>,
  ): Promise<void>;
}
