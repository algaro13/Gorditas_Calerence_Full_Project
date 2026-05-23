import { IOrdenRepository, IProductoRepository, PaginationOptions } from '../interfaces/repositories';
import { IOrdenesService } from '../interfaces/services';
import { validateStatusTransition } from '../domain/orden-status';
import { calculateOrdenTotal } from '../domain/orden-calculator';
import { validateInventoryAvailability } from '../domain/inventory-validator';
import { calculateImporte } from '../utils/helpers';
import { generateFolio } from '../utils/counters';
import { OrdenStatus } from '../types';

export class ServiceError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class OrdenesService implements IOrdenesService {
  constructor(
    private ordenRepo: IOrdenRepository,
    private productoRepo: IProductoRepository
  ) {}

  async listOrdenes(filter: Record<string, any>, pagination: PaginationOptions): Promise<any> {
    const result = await this.ordenRepo.find(filter, pagination);
    return {
      ordenes: result.items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: result.total,
        pages: Math.ceil(result.total / pagination.limit),
      },
    };
  }

  async getOrdenById(id: string): Promise<any> {
    const orden = await this.ordenRepo.findById(id);
    if (!orden) throw new ServiceError('Orden no encontrada', 404);

    const subordenes = await this.ordenRepo.findSubordenesByOrdenId(id);
    const productos = await this.ordenRepo.findDetallesProductoByOrdenId(id);

    const subordenIds = subordenes.map((sub: any) => sub._id?.toString() || sub._id);
    const platillos = await this.ordenRepo.findDetallesPlatilloBySubordenIds(subordenIds);

    const platilloIds = platillos.map((p: any) => p._id?.toString() || p._id);
    const extras = await this.ordenRepo.findDetallesExtraByPlatilloIds(platilloIds);

    const platillosConExtras = platillos.map((platillo: any) => {
      const extrasDelPlatillo = extras.filter(
        (extra: any) => extra.idOrdenDetallePlatillo === (platillo._id?.toString() || platillo._id)
      );
      return { ...platillo, extras: extrasDelPlatillo };
    });

    return {
      ...orden,
      subordenes,
      productos,
      platillos: platillosConExtras,
      extras,
    };
  }

  async createOrden(data: Record<string, any>): Promise<any> {
    const folio = await generateFolio();
    const orden = await this.ordenRepo.create({
      folio,
      ...data,
      estatus: data.estatus || OrdenStatus.RECEPCION,
    });
    return orden;
  }

  async createSuborden(ordenId: string, nombre: string): Promise<any> {
    const orden = await this.ordenRepo.findById(ordenId);
    if (!orden) throw new ServiceError('Orden no encontrada', 404);

    return this.ordenRepo.createSuborden({ idOrden: ordenId, nombre });
  }

  async addProducto(ordenId: string, data: Record<string, any>): Promise<any> {
    const orden = await this.ordenRepo.findById(ordenId);
    if (!orden) throw new ServiceError('Orden no encontrada', 404);

    const { idProducto, costoProducto, cantidad } = data;

    const producto = await this.productoRepo.findById(idProducto);
    const validation = validateInventoryAvailability(producto?.cantidad || 0, cantidad);
    if (!validation.available) {
      throw new ServiceError('Producto no disponible o stock insuficiente', 400);
    }

    const importe = calculateImporte(costoProducto, cantidad);
    const detalleProducto = await this.ordenRepo.createDetalleProducto({
      idOrden: ordenId,
      ...data,
      importe,
    });

    await this.productoRepo.incrementQuantity(idProducto, -cantidad);
    await this.recalculateOrdenTotal(ordenId);

    return detalleProducto;
  }

  async addPlatillo(subordenId: string, data: Record<string, any>): Promise<any> {
    const suborden = await this.ordenRepo.findSubordenById(subordenId);
    if (!suborden) throw new ServiceError('Suborden no encontrada', 404);

    let { costoPlatillo, cantidad } = data;
    costoPlatillo = Number(costoPlatillo);
    cantidad = Number(cantidad);

    if (isNaN(costoPlatillo) || isNaN(cantidad) || costoPlatillo <= 0 || cantidad <= 0) {
      throw new ServiceError('Costo y cantidad deben ser números mayores a 0', 400);
    }

    const importe = calculateImporte(costoPlatillo, cantidad);
    const detallePlatillo = await this.ordenRepo.createDetallePlatillo({
      ...data,
      costoPlatillo,
      cantidad,
      idSuborden: subordenId,
      importe,
    });

    await this.recalculateOrdenTotal(suborden.idOrden);
    return detallePlatillo;
  }

  async addExtra(platilloDetalleId: string, data: Record<string, any>): Promise<any> {
    const platilloDetalle = await this.ordenRepo.findDetallePlatilloById(platilloDetalleId);
    if (!platilloDetalle) throw new ServiceError('Detalle de platillo no encontrado', 404);

    const { costoExtra, cantidad } = data;
    const importe = calculateImporte(costoExtra, cantidad);

    const detalleExtra = await this.ordenRepo.createDetalleExtra({
      idOrdenDetallePlatillo: platilloDetalleId,
      ...data,
      importe,
    });

    const suborden = await this.ordenRepo.findSubordenById(platilloDetalle.idSuborden);
    if (suborden) {
      await this.recalculateOrdenTotal(suborden.idOrden);
    }

    return detalleExtra;
  }

  async changeEstatus(ordenId: string, estatus: string, userRole: string): Promise<any> {
    if (!Object.values(OrdenStatus).includes(estatus as OrdenStatus)) {
      throw new ServiceError('Estatus no válido', 400);
    }

    const orden = await this.ordenRepo.findById(ordenId);
    if (!orden) throw new ServiceError('Orden no encontrada', 404);

    const isValid = validateStatusTransition(orden.estatus, estatus, userRole);
    if (!isValid) {
      throw new ServiceError('Transición de estatus no permitida para su rol', 403);
    }

    const updateData: Record<string, any> = { estatus };
    if (estatus === 'Pagada') {
      updateData.fechaPago = new Date();
    }

    // Si se marca como Surtida, marcar todos los items como listo
    if (estatus === 'Surtida') {
      const subordenes = await this.ordenRepo.findSubordenesByOrdenId(ordenId);
      const subordenIds = subordenes.map((s: any) => String(s._id));

      await this.ordenRepo.updateManyDetallesProducto({ idOrden: ordenId }, { listo: true });
      await this.ordenRepo.updateManyDetallesPlatillo({ idSuborden: { $in: subordenIds } }, { listo: true });

      const platillos = await this.ordenRepo.findDetallesPlatilloBySubordenIds(subordenIds);
      const platilloIds = platillos.map((p: any) => String(p._id));
      await this.ordenRepo.updateManyDetallesExtra({ idOrdenDetallePlatillo: { $in: platilloIds } }, { listo: true });
    }

    return this.ordenRepo.updateById(ordenId, updateData);
  }

  async updateFechaHora(ordenId: string, fechaHora?: string): Promise<any> {
    const orden = await this.ordenRepo.findById(ordenId);
    if (!orden) throw new ServiceError('Orden no encontrada', 404);

    const newFecha = fechaHora ? new Date(fechaHora) : new Date();
    return this.ordenRepo.updateById(ordenId, { fechaHora: newFecha } as any);
  }

  async verificarOrden(ordenId: string, isComplete: boolean): Promise<any> {
    const orden = await this.ordenRepo.findById(ordenId);
    if (!orden) throw new ServiceError('Orden no encontrada', 404);

    if (orden.estatus !== OrdenStatus.PENDIENTE) {
      throw new ServiceError('Solo se pueden verificar órdenes pendientes', 400);
    }

    const newStatus = isComplete ? OrdenStatus.RECEPCION : OrdenStatus.PENDIENTE;
    return this.ordenRepo.updateById(ordenId, { estatus: newStatus });
  }

  async markProductoListo(id: string): Promise<void> {
    const producto = await this.ordenRepo.findDetalleProductoById(id);
    if (!producto) throw new ServiceError('Producto no encontrado', 404);
    await this.ordenRepo.updateDetalleProductoById(id, { listo: true } as any);
  }

  async markPlatilloListo(id: string): Promise<void> {
    const platillo = await this.ordenRepo.findDetallePlatilloById(id);
    if (!platillo) throw new ServiceError('Platillo no encontrado', 404);
    await this.ordenRepo.updateDetallePlatilloById(id, { listo: true } as any);
  }

  async markExtraListo(id: string): Promise<void> {
    const extra = await this.ordenRepo.findDetalleExtraById(id);
    if (!extra) throw new ServiceError('Extra no encontrado', 404);
    await this.ordenRepo.updateDetalleExtraById(id, { listo: true } as any);
  }

  async markProductoEntregado(id: string): Promise<void> {
    const producto = await this.ordenRepo.findDetalleProductoById(id);
    if (!producto) throw new ServiceError('Producto no encontrado', 404);
    await this.ordenRepo.updateDetalleProductoById(id, { entregado: true } as any);
  }

  async markPlatilloEntregado(id: string): Promise<void> {
    const platillo = await this.ordenRepo.findDetallePlatilloById(id);
    if (!platillo) throw new ServiceError('Platillo no encontrado', 404);
    await this.ordenRepo.updateDetallePlatilloById(id, { entregado: true } as any);
  }

  async markExtraEntregado(id: string): Promise<void> {
    const extra = await this.ordenRepo.findDetalleExtraById(id);
    if (!extra) throw new ServiceError('Extra no encontrado', 404);
    await this.ordenRepo.updateDetalleExtraById(id, { entregado: true } as any);
  }

  async updateExtraEstatus(id: string, estatus: string): Promise<any> {
    const entregado = estatus === 'entregado';
    const extra = await this.ordenRepo.updateDetalleExtraById(id, { entregado } as any);
    if (!extra) throw new ServiceError('Extra no encontrado', 404);
    return extra;
  }

  async updatePlatilloNota(id: string, notas: string): Promise<void> {
    const platillo = await this.ordenRepo.findDetallePlatilloById(id);
    if (!platillo) throw new ServiceError('Platillo no encontrado', 404);
    await this.ordenRepo.updateDetallePlatilloById(id, { notas } as any);
  }

  async deletePlatillo(id: string): Promise<void> {
    const platillo = await this.ordenRepo.findDetallePlatilloById(id);
    if (!platillo) throw new ServiceError('Platillo no encontrado', 404);

    await this.ordenRepo.deleteDetallePlatilloById(id);
    const suborden = await this.ordenRepo.findSubordenById(platillo.idSuborden);
    if (suborden) {
      await this.recalculateOrdenTotal(suborden.idOrden);
    }
  }

  async deleteProducto(id: string): Promise<void> {
    const producto = await this.ordenRepo.findDetalleProductoById(id);
    if (!producto) throw new ServiceError('Producto no encontrado', 404);

    await this.ordenRepo.deleteDetalleProductoById(id);
    await this.recalculateOrdenTotal(producto.idOrden);
  }

  async deleteExtra(id: string): Promise<void> {
    const extra = await this.ordenRepo.findDetalleExtraById(id);
    if (!extra) throw new ServiceError('Extra no encontrado', 404);

    const platillo = await this.ordenRepo.findDetallePlatilloById(extra.idOrdenDetallePlatillo);
    if (platillo) {
      const suborden = await this.ordenRepo.findSubordenById(platillo.idSuborden);
      if (suborden) {
        await this.ordenRepo.deleteDetalleExtraById(id);
        await this.recalculateOrdenTotal(suborden.idOrden);
        return;
      }
    }
    await this.ordenRepo.deleteDetalleExtraById(id);
  }

  async deleteOrden(id: string): Promise<void> {
    const orden = await this.ordenRepo.findById(id);
    if (!orden) throw new ServiceError('Orden no encontrada', 404);

    const subordenes = await this.ordenRepo.findSubordenesByOrdenId(id);
    const subordenIds = subordenes.map((s: any) => String(s._id));

    const platillos = await this.ordenRepo.findDetallesPlatilloBySubordenIds(subordenIds);
    const platilloIds = platillos.map((p: any) => String(p._id));

    await this.ordenRepo.deleteDetallesExtraByPlatilloIds(platilloIds);
    await this.ordenRepo.deleteDetallesPlatilloBySubordenIds(subordenIds);
    await this.ordenRepo.deleteDetallesProductoByOrdenId(id);
    await this.ordenRepo.deleteSubordenesByOrdenId(id);
    await this.ordenRepo.deleteById(id);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async recalculateOrdenTotal(ordenId: string): Promise<void> {
    const subordenes = await this.ordenRepo.findSubordenesByOrdenId(ordenId);
    const subordenIds = subordenes.map((s: any) => String(s._id));

    const platillos = await this.ordenRepo.findDetallesPlatilloBySubordenIds(subordenIds);
    const platilloIds = platillos.map((p: any) => String(p._id));

    const [productosAgg, platillosAgg, extrasAgg] = await Promise.all([
      this.ordenRepo.aggregateDetallesProducto([
        { $match: { idOrden: ordenId } },
        { $group: { _id: null, total: { $sum: '$importe' } } },
      ]),
      this.ordenRepo.aggregateDetallesPlatillo([
        { $match: { idSuborden: { $in: subordenIds } } },
        { $group: { _id: null, total: { $sum: '$importe' } } },
      ]),
      this.ordenRepo.aggregateDetallesExtra([
        { $match: { idOrdenDetallePlatillo: { $in: platilloIds } } },
        { $group: { _id: null, total: { $sum: '$importe' } } },
      ]),
    ]);

    const total = calculateOrdenTotal(
      [productosAgg[0]?.total || 0],
      [platillosAgg[0]?.total || 0],
      [extrasAgg[0]?.total || 0]
    );

    await this.ordenRepo.updateById(ordenId, { total });
  }
}
