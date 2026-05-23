import {
  Orden,
  Suborden,
  OrdenDetalleProducto,
  OrdenDetallePlatillo,
  OrdenDetalleExtra,
} from '../models';
import { IOrdenRepository, PaginationOptions, PaginatedResult } from '../interfaces/repositories';
import {
  IOrden,
  ISuborden,
  IOrdenDetalleProducto,
  IOrdenDetallePlatillo,
  IOrdenDetalleExtra,
} from '../types';

export class OrdenRepository implements IOrdenRepository {
  // ─── Orden ─────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<IOrden | null> {
    return Orden.findById(id).lean() as any;
  }

  async find(filter: Record<string, any>, pagination: PaginationOptions): Promise<PaginatedResult<IOrden>> {
    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      Orden.find(filter).sort({ fechaHora: -1 }).skip(skip).limit(pagination.limit).lean(),
      Orden.countDocuments(filter),
    ]);
    return { items: items as any, total };
  }

  async create(data: Partial<IOrden>): Promise<IOrden> {
    const orden = new Orden(data);
    await orden.save();
    return orden.toObject() as any;
  }

  async updateById(id: string, data: Partial<IOrden>): Promise<IOrden | null> {
    return Orden.findByIdAndUpdate(id, data, { new: true }).lean() as any;
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await Orden.findByIdAndDelete(id);
    return result !== null;
  }

  async countDocuments(filter: Record<string, any>): Promise<number> {
    return Orden.countDocuments(filter);
  }

  async aggregate(pipeline: any[]): Promise<any[]> {
    return Orden.aggregate(pipeline);
  }

  // ─── Suborden ──────────────────────────────────────────────────────────────

  async findSubordenById(id: string): Promise<ISuborden | null> {
    return Suborden.findById(id).lean() as any;
  }

  async findSubordenesByOrdenId(ordenId: string): Promise<ISuborden[]> {
    return Suborden.find({ idOrden: ordenId }).lean() as any;
  }

  async createSuborden(data: Partial<ISuborden>): Promise<ISuborden> {
    const suborden = new Suborden(data);
    await suborden.save();
    return suborden.toObject() as any;
  }

  async deleteSubordenesByOrdenId(ordenId: string): Promise<void> {
    await Suborden.deleteMany({ idOrden: ordenId });
  }

  // ─── Detalle Producto ──────────────────────────────────────────────────────

  async findDetalleProductoById(id: string): Promise<IOrdenDetalleProducto | null> {
    return OrdenDetalleProducto.findById(id).lean() as any;
  }

  async findDetallesProductoByOrdenId(ordenId: string): Promise<IOrdenDetalleProducto[]> {
    return OrdenDetalleProducto.find({ idOrden: ordenId }).lean() as any;
  }

  async createDetalleProducto(data: Partial<IOrdenDetalleProducto>): Promise<IOrdenDetalleProducto> {
    const detalle = new OrdenDetalleProducto(data);
    await detalle.save();
    return detalle.toObject() as any;
  }

  async updateDetalleProductoById(id: string, data: Partial<IOrdenDetalleProducto>): Promise<IOrdenDetalleProducto | null> {
    return OrdenDetalleProducto.findByIdAndUpdate(id, data, { new: true }).lean() as any;
  }

  async deleteDetalleProductoById(id: string): Promise<boolean> {
    const result = await OrdenDetalleProducto.findByIdAndDelete(id);
    return result !== null;
  }

  async deleteDetallesProductoByOrdenId(ordenId: string): Promise<void> {
    await OrdenDetalleProducto.deleteMany({ idOrden: ordenId });
  }

  async updateManyDetallesProducto(filter: Record<string, any>, data: Record<string, any>): Promise<void> {
    await OrdenDetalleProducto.updateMany(filter, { $set: data });
  }

  async aggregateDetallesProducto(pipeline: any[]): Promise<any[]> {
    return OrdenDetalleProducto.aggregate(pipeline);
  }

  // ─── Detalle Platillo ──────────────────────────────────────────────────────

  async findDetallePlatilloById(id: string): Promise<IOrdenDetallePlatillo | null> {
    return OrdenDetallePlatillo.findById(id).lean() as any;
  }

  async findDetallesPlatilloBySubordenIds(subordenIds: string[]): Promise<IOrdenDetallePlatillo[]> {
    return OrdenDetallePlatillo.find({ idSuborden: { $in: subordenIds } }).lean() as any;
  }

  async createDetallePlatillo(data: Partial<IOrdenDetallePlatillo>): Promise<IOrdenDetallePlatillo> {
    const detalle = new OrdenDetallePlatillo(data);
    await detalle.save();
    return detalle.toObject() as any;
  }

  async updateDetallePlatilloById(id: string, data: Partial<IOrdenDetallePlatillo>): Promise<IOrdenDetallePlatillo | null> {
    return OrdenDetallePlatillo.findByIdAndUpdate(id, data, { new: true }).lean() as any;
  }

  async deleteDetallePlatilloById(id: string): Promise<boolean> {
    const result = await OrdenDetallePlatillo.findByIdAndDelete(id);
    return result !== null;
  }

  async deleteDetallesPlatilloBySubordenIds(subordenIds: string[]): Promise<void> {
    await OrdenDetallePlatillo.deleteMany({ idSuborden: { $in: subordenIds } });
  }

  async updateManyDetallesPlatillo(filter: Record<string, any>, data: Record<string, any>): Promise<void> {
    await OrdenDetallePlatillo.updateMany(filter, { $set: data });
  }

  async aggregateDetallesPlatillo(pipeline: any[]): Promise<any[]> {
    return OrdenDetallePlatillo.aggregate(pipeline);
  }

  // ─── Detalle Extra ─────────────────────────────────────────────────────────

  async findDetalleExtraById(id: string): Promise<IOrdenDetalleExtra | null> {
    return OrdenDetalleExtra.findById(id).lean() as any;
  }

  async findDetallesExtraByPlatilloIds(platilloIds: string[]): Promise<IOrdenDetalleExtra[]> {
    return OrdenDetalleExtra.find({ idOrdenDetallePlatillo: { $in: platilloIds } }).lean() as any;
  }

  async createDetalleExtra(data: Partial<IOrdenDetalleExtra>): Promise<IOrdenDetalleExtra> {
    const detalle = new OrdenDetalleExtra(data);
    await detalle.save();
    return detalle.toObject() as any;
  }

  async updateDetalleExtraById(id: string, data: Partial<IOrdenDetalleExtra>): Promise<IOrdenDetalleExtra | null> {
    return OrdenDetalleExtra.findByIdAndUpdate(id, data, { new: true }).lean() as any;
  }

  async deleteDetalleExtraById(id: string): Promise<boolean> {
    const result = await OrdenDetalleExtra.findByIdAndDelete(id);
    return result !== null;
  }

  async deleteDetallesExtraByPlatilloIds(platilloIds: string[]): Promise<void> {
    await OrdenDetalleExtra.deleteMany({ idOrdenDetallePlatillo: { $in: platilloIds } });
  }

  async updateManyDetallesExtra(filter: Record<string, any>, data: Record<string, any>): Promise<void> {
    await OrdenDetalleExtra.updateMany(filter, { $set: data });
  }

  async aggregateDetallesExtra(pipeline: any[]): Promise<any[]> {
    return OrdenDetalleExtra.aggregate(pipeline);
  }
}
