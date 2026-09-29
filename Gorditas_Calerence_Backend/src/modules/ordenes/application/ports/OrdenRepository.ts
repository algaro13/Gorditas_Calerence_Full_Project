import type { OrdenEstatus } from '../../domain/OrdenStatus';
import type { OrdenCabecera, OrdenConDetalles } from '../../domain/types';

export interface OrdenFilter {
  estatus?: OrdenEstatus;
  estatusNo?: OrdenEstatus[];
  idMesa?: number;
  rango?: { from: Date; to: Date };
}

export interface NuevaOrden {
  folio: string;
  idTipoOrden: number;
  nombreTipoOrden: string;
  estatus: OrdenEstatus;
  idMesa: number | null;
  nombreMesa: string | null;
  nombreCliente: string | null;
  notas: string | null;
  total: number;
}

export interface OrdenRepository {
  list(filter: OrdenFilter, page: { skip: number; take: number }): Promise<{ rows: OrdenCabecera[]; total: number }>;
  findById(id: string): Promise<OrdenCabecera | null>;
  findTree(id: string): Promise<OrdenConDetalles | null>;
  create(data: NuevaOrden): Promise<OrdenCabecera>;
  update(id: string, data: Partial<Pick<OrdenCabecera, 'estatus' | 'fechaPago' | 'fechaHora'>>): Promise<OrdenCabecera>;
  delete(id: string): Promise<void>;
  /** Recalcula `total` como suma de productos + platillos + extras y devuelve el nuevo valor. */
  recalcularTotal(id: string): Promise<number>;
  /** Marca `listo = true` en todas las líneas de la orden. */
  marcarTodoListo(id: string): Promise<void>;
  /**
   * Desactiva la mesa si es la temporal de un pedido para llevar y ya no le queda ninguna orden
   * abierta. Una mesa de verdad no se toca nunca.
   */
  retirarMesaTemporal(idMesa: number): Promise<void>;
}
