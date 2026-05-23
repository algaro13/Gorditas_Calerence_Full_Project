import { IProductoRepository, PaginationOptions } from '../interfaces/repositories';
import { IInventarioService } from '../interfaces/services';
import { ServiceError } from './ordenes.service';

export class InventarioService implements IInventarioService {
  constructor(private productoRepo: IProductoRepository) {}

  async getInventario(filter: Record<string, any>, pagination: PaginationOptions): Promise<any> {
    const result = await this.productoRepo.find(filter, pagination);

    const productosConAlertas = result.items.map((producto: any) => ({
      ...producto,
      stockBajo: producto.cantidad <= 5,
      stockAgotado: producto.cantidad === 0,
    }));

    return {
      productos: productosConAlertas,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: result.total,
        pages: Math.ceil(result.total / pagination.limit),
      },
      resumen: {
        total: result.total,
        stockBajo: result.items.filter((p: any) => p.cantidad <= 5 && p.cantidad > 0).length,
        stockAgotado: result.items.filter((p: any) => p.cantidad === 0).length,
      },
    };
  }

  async recibirProductos(productos: Array<{ idProducto: string; cantidad: number }>): Promise<any> {
    if (!Array.isArray(productos) || productos.length === 0) {
      throw new ServiceError('Debe proporcionar al menos un producto', 400);
    }

    const updates = [];
    for (const item of productos) {
      const { idProducto, cantidad } = item;
      if (cantidad <= 0) continue;

      const update = await this.productoRepo.incrementQuantity(idProducto, cantidad);
      if (update) {
        updates.push(update);
      }
    }

    return updates;
  }

  async ajustarInventario(id: string, cantidad: number, motivo?: string): Promise<any> {
    if (cantidad < 0) {
      throw new ServiceError('La cantidad no puede ser negativa', 400);
    }

    const producto = await this.productoRepo.updateById(id, { cantidad } as any);
    if (!producto) {
      throw new ServiceError('Producto no encontrado', 404);
    }

    return producto;
  }
}
