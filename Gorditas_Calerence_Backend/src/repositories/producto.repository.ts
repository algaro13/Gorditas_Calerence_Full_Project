import { Producto } from '../models';
import { IProductoRepository, PaginationOptions, PaginatedResult } from '../interfaces/repositories';
import { IProducto } from '../types';

export class ProductoRepository implements IProductoRepository {
  async findById(id: string | number): Promise<IProducto | null> {
    return Producto.findById(id).lean() as any;
  }

  async find(filter: Record<string, any>, pagination: PaginationOptions): Promise<PaginatedResult<IProducto>> {
    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      Producto.find(filter).sort({ nombre: 1 }).skip(skip).limit(pagination.limit).lean(),
      Producto.countDocuments(filter),
    ]);
    return { items: items as any, total };
  }

  async findAll(filter: Record<string, any>): Promise<IProducto[]> {
    return Producto.find(filter).sort({ cantidad: 1 }).lean() as any;
  }

  async updateById(id: string | number, data: Partial<IProducto>): Promise<IProducto | null> {
    return Producto.findByIdAndUpdate(id, data, { new: true }).lean() as any;
  }

  async incrementQuantity(id: string | number, amount: number): Promise<IProducto | null> {
    return Producto.findByIdAndUpdate(id, { $inc: { cantidad: amount } }, { new: true }).lean() as any;
  }

  async countDocuments(filter: Record<string, any>): Promise<number> {
    return Producto.countDocuments(filter);
  }
}
