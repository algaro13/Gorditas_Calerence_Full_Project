import {
  Guiso, TipoProducto, Producto, TipoPlatillo, Platillo,
  TipoExtra, Extra, TipoUsuario, Usuario, TipoOrden, Mesa, TipoGasto, Gasto
} from '../models';
import { ICatalogoRepository, IGastoRepository, PaginationOptions, PaginatedResult } from '../interfaces/repositories';
import { IGasto } from '../types';

const modelMap: Record<string, any> = {
  guiso: Guiso,
  tipoproducto: TipoProducto,
  'tipo-producto': TipoProducto,
  producto: Producto,
  tipoplatillo: TipoPlatillo,
  'tipo-platillo': TipoPlatillo,
  platillo: Platillo,
  tipoextra: TipoExtra,
  'tipo-extra': TipoExtra,
  extra: Extra,
  tipousuario: TipoUsuario,
  'tipo-usuario': TipoUsuario,
  usuario: Usuario,
  tipoorden: TipoOrden,
  'tipo-orden': TipoOrden,
  mesa: Mesa,
  tipogasto: TipoGasto,
  'tipo-gasto': TipoGasto,
  gasto: Gasto,
};

export function getModelForCatalogo(modelo: string): any | null {
  return modelMap[modelo.toLowerCase()] || null;
}

export class CatalogoRepository implements ICatalogoRepository {
  async find(modelo: string, filter: Record<string, any>, pagination: PaginationOptions): Promise<PaginatedResult<any>> {
    const Model = getModelForCatalogo(modelo);
    if (!Model) throw new Error(`Modelo no válido: ${modelo}`);

    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      Model.find(filter).sort({ nombre: 1 }).skip(skip).limit(pagination.limit).lean(),
      Model.countDocuments(filter),
    ]);
    return { items, total };
  }

  async findById(modelo: string, id: string | number): Promise<any | null> {
    const Model = getModelForCatalogo(modelo);
    if (!Model) throw new Error(`Modelo no válido: ${modelo}`);
    return Model.findById(id).lean();
  }

  async create(modelo: string, data: Record<string, any>): Promise<any> {
    const Model = getModelForCatalogo(modelo);
    if (!Model) throw new Error(`Modelo no válido: ${modelo}`);
    const item = new Model(data);
    await item.save();
    return item.toObject();
  }

  async updateById(modelo: string, id: string | number, data: Record<string, any>): Promise<any | null> {
    const Model = getModelForCatalogo(modelo);
    if (!Model) throw new Error(`Modelo no válido: ${modelo}`);
    return Model.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  }

  async deleteById(modelo: string, id: string | number): Promise<boolean> {
    const Model = getModelForCatalogo(modelo);
    if (!Model) throw new Error(`Modelo no válido: ${modelo}`);
    const result = await Model.findByIdAndDelete(id);
    return result !== null;
  }
}

// ─── Gasto Repository ──────────────────────────────────────────────────────────

export class GastoRepository implements IGastoRepository {
  async findById(id: string): Promise<IGasto | null> {
    return Gasto.findById(id).lean() as any;
  }

  async find(filter: Record<string, any>): Promise<IGasto[]> {
    return Gasto.find(filter).sort({ fecha: -1 }).lean() as any;
  }

  async create(data: Partial<IGasto>): Promise<IGasto> {
    const gasto = new Gasto(data);
    await gasto.save();
    return gasto.toObject() as any;
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await Gasto.findByIdAndDelete(id);
    return result !== null;
  }

  async aggregate(pipeline: any[]): Promise<any[]> {
    return Gasto.aggregate(pipeline);
  }
}
