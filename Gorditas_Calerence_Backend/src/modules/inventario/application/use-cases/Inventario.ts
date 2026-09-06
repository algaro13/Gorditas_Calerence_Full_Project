import type { UnitOfWork } from '../../../../shared/application/ports/UnitOfWork';
import { NotFoundError, ValidationError } from '../../../../shared/domain/DomainError';
import type { InventarioRepository, ProductoStock } from '../ports/InventarioRepository';

export const STOCK_BAJO = 5;

export function conAlertas(p: ProductoStock): ProductoStock & { stockBajo: boolean; stockAgotado: boolean } {
  return { ...p, stockBajo: p.cantidad <= STOCK_BAJO, stockAgotado: p.cantidad === 0 };
}

export class ConsultarInventario {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly repo: InventarioRepository,
  ) {}

  execute(filter: { idTipoProducto?: number; activo?: boolean }, page: { skip: number; take: number }) {
    return this.uow.run(async () => {
      const { rows, total } = await this.repo.list(filter, page);
      const productos = rows.map(conAlertas);
      return {
        productos,
        total,
        resumen: {
          total,
          stockBajo: rows.filter((p) => p.cantidad <= STOCK_BAJO && p.cantidad > 0).length,
          stockAgotado: rows.filter((p) => p.cantidad === 0).length,
        },
      };
    });
  }
}

export class RecibirProductos {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly repo: InventarioRepository,
  ) {}

  execute(items: Array<{ idProducto: number; cantidad: number }>): Promise<ProductoStock[]> {
    if (!Array.isArray(items) || items.length === 0) throw new ValidationError('Debe proporcionar al menos un producto', 'SIN_PRODUCTOS');
    return this.uow.run(async () => {
      const updates: ProductoStock[] = [];
      for (const item of items) {
        if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) continue;
        const row = await this.repo.incrementar(item.idProducto, item.cantidad);
        if (row) updates.push(row);
      }
      return updates;
    });
  }
}

export class AjustarInventario {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly repo: InventarioRepository,
  ) {}

  execute(idProducto: number, cantidad: number): Promise<ProductoStock> {
    if (!Number.isInteger(cantidad) || cantidad < 0) throw new ValidationError('La cantidad no puede ser negativa', 'CANTIDAD_INVALIDA');
    return this.uow.run(async () => {
      const row = await this.repo.setCantidad(idProducto, cantidad);
      if (!row) throw new NotFoundError('Producto no encontrado', 'PRODUCTO_NOT_FOUND');
      return row;
    });
  }
}
