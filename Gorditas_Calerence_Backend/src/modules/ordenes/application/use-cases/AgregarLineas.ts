import type { UnitOfWork } from '../../../../shared/application/ports/UnitOfWork';
import { NotFoundError, ValidationError } from '../../../../shared/domain/DomainError';
import { multiply, toMoney } from '../../../../shared/domain/Money';
import type { LineaExtra, LineaPlatillo, LineaProducto, Suborden } from '../../domain/types';
import type { CatalogoLookup } from '../ports/CatalogoLookup';
import type { OrdenLineasRepository } from '../ports/OrdenLineasRepository';
import type { OrdenRepository } from '../ports/OrdenRepository';
import type { StockRepository } from '../ports/StockRepository';

/** El precio lo fija el catálogo; el enviado por el cliente solo aplica si el catálogo no tiene precio. */
function precioAutoritativo(catalogo: number, cliente: number | undefined): number {
  if (catalogo > 0) return catalogo;
  return toMoney(cliente ?? 0);
}

export class AgregarSuborden {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ordenes: OrdenRepository,
    private readonly lineas: OrdenLineasRepository,
  ) {}

  execute(idOrden: string, nombre: string): Promise<Suborden> {
    return this.uow.run(async () => {
      const orden = await this.ordenes.findById(idOrden);
      if (!orden) throw new NotFoundError('Orden no encontrada', 'ORDEN_NOT_FOUND');
      return this.lineas.createSuborden(orden.id, nombre.trim());
    });
  }
}

export interface AgregarPlatilloInput {
  idPlatillo: number;
  idGuiso: number;
  cantidad: number;
  costoPlatillo?: number;
  notas?: string | null;
}

export class AgregarPlatillo {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ordenes: OrdenRepository,
    private readonly lineas: OrdenLineasRepository,
    private readonly catalogo: CatalogoLookup,
  ) {}

  execute(idSuborden: string, input: AgregarPlatilloInput): Promise<LineaPlatillo & { total: number }> {
    return this.uow.run(async () => {
      const suborden = await this.lineas.findSuborden(idSuborden);
      if (!suborden) throw new NotFoundError('Suborden no encontrada', 'SUBORDEN_NOT_FOUND');
      if (!Number.isInteger(input.cantidad) || input.cantidad <= 0) throw new ValidationError('Costo y cantidad deben ser números mayores a 0');

      const [platillo, guiso] = await Promise.all([this.catalogo.platillo(input.idPlatillo), this.catalogo.guiso(input.idGuiso)]);
      if (!platillo || !platillo.activo) throw new ValidationError('Platillo no válido o inactivo', 'PLATILLO_INVALIDO');
      if (!guiso || !guiso.activo) throw new ValidationError('Guiso no válido o inactivo', 'GUISO_INVALIDO');

      const costoPlatillo = precioAutoritativo(platillo.precio, input.costoPlatillo);
      if (costoPlatillo <= 0) throw new ValidationError('Costo y cantidad deben ser números mayores a 0');

      const linea = await this.lineas.createPlatillo({
        idSuborden: suborden.id,
        idPlatillo: platillo.id,
        nombrePlatillo: platillo.nombre,
        idGuiso: guiso.id,
        nombreGuiso: guiso.nombre,
        costoPlatillo,
        cantidad: input.cantidad,
        importe: multiply(costoPlatillo, input.cantidad),
        notas: input.notas?.trim() || null,
      });
      const total = await this.ordenes.recalcularTotal(suborden.idOrden);
      return { ...linea, total };
    });
  }
}

export interface AgregarProductoInput {
  idProducto: number;
  cantidad: number;
  costoProducto?: number;
}

export class AgregarProducto {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ordenes: OrdenRepository,
    private readonly lineas: OrdenLineasRepository,
    private readonly stock: StockRepository,
    private readonly catalogo: CatalogoLookup,
  ) {}

  execute(idOrden: string, input: AgregarProductoInput): Promise<LineaProducto & { total: number }> {
    return this.uow.run(async () => {
      const orden = await this.ordenes.findById(idOrden);
      if (!orden) throw new NotFoundError('Orden no encontrada', 'ORDEN_NOT_FOUND');
      if (!Number.isInteger(input.cantidad) || input.cantidad <= 0) throw new ValidationError('La cantidad debe ser mayor a 0');

      const producto = await this.catalogo.producto(input.idProducto);
      if (!producto) throw new ValidationError('Producto no disponible o stock insuficiente', 'SIN_STOCK');

      // Decremento atómico: falla si no hay existencia suficiente o el producto está inactivo
      const actualizado = await this.stock.decrementar(producto.id, input.cantidad);
      if (!actualizado) throw new ValidationError('Producto no disponible o stock insuficiente', 'SIN_STOCK');

      const costoProducto = precioAutoritativo(producto.precio, input.costoProducto);
      const linea = await this.lineas.createProducto({
        idOrden: orden.id,
        idProducto: producto.id,
        nombreProducto: producto.nombre,
        costoProducto,
        cantidad: input.cantidad,
        importe: multiply(costoProducto, input.cantidad),
      });
      const total = await this.ordenes.recalcularTotal(orden.id);
      return { ...linea, total };
    });
  }
}

export interface AgregarExtraInput {
  idExtra: number;
  cantidad: number;
  costoExtra?: number;
}

export class AgregarExtra {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ordenes: OrdenRepository,
    private readonly lineas: OrdenLineasRepository,
    private readonly catalogo: CatalogoLookup,
  ) {}

  execute(idLineaPlatillo: string, input: AgregarExtraInput): Promise<LineaExtra & { total: number }> {
    return this.uow.run(async () => {
      const platillo = await this.lineas.findPlatillo(idLineaPlatillo);
      if (!platillo) throw new NotFoundError('Detalle de platillo no encontrado', 'LINEA_NOT_FOUND');
      if (!Number.isInteger(input.cantidad) || input.cantidad <= 0) throw new ValidationError('La cantidad debe ser mayor a 0');

      const extra = await this.catalogo.extra(input.idExtra);
      if (!extra || !extra.activo) throw new ValidationError('Extra no válido o inactivo', 'EXTRA_INVALIDO');

      const costoExtra = precioAutoritativo(extra.precio, input.costoExtra);
      const linea = await this.lineas.createExtra({
        idOrdenDetallePlatillo: platillo.id,
        idExtra: extra.id,
        nombreExtra: extra.nombre,
        costoExtra,
        cantidad: input.cantidad,
        importe: multiply(costoExtra, input.cantidad),
      });
      const idOrden = await this.lineas.ordenIdOf('platillo', platillo.id);
      const total = idOrden ? await this.ordenes.recalcularTotal(idOrden) : 0;
      return { ...linea, total };
    });
  }
}
