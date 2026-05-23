import bcrypt from 'bcryptjs';
import { ICatalogoRepository, PaginationOptions } from '../interfaces/repositories';
import { ICatalogosService } from '../interfaces/services';
import { ServiceError } from './ordenes.service';
import { getModelForCatalogo } from '../repositories/catalogo.repository';
import { getNextSequence, getNextPedidoNumber } from '../utils/counters';

export class CatalogosService implements ICatalogosService {
  constructor(private catalogoRepo: ICatalogoRepository) {}

  async list(modelo: string, filter: Record<string, any>, pagination: PaginationOptions): Promise<any> {
    if (!getModelForCatalogo(modelo)) {
      throw new ServiceError('Modelo no válido', 400);
    }

    const result = await this.catalogoRepo.find(modelo, filter, pagination);
    return {
      items: result.items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: result.total,
        pages: Math.ceil(result.total / pagination.limit),
      },
    };
  }

  async create(modelo: string, data: Record<string, any>): Promise<any> {
    if (!getModelForCatalogo(modelo)) {
      throw new ServiceError('Modelo no válido', 400);
    }

    const needsNumericId = !['usuario'].includes(modelo.toLowerCase());
    let itemData = { ...data };

    if (needsNumericId) {
      const nextId = await getNextSequence(modelo.toLowerCase());
      itemData._id = nextId;
    }

    return this.catalogoRepo.create(modelo, itemData);
  }

  async update(modelo: string, id: string | number, data: Record<string, any>): Promise<any> {
    if (!getModelForCatalogo(modelo)) {
      throw new ServiceError('Modelo no válido', 400);
    }

    let updateData = { ...data };
    if (modelo.toLowerCase() === 'usuario' && updateData.password) {
      const salt = await bcrypt.genSalt(12);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    const item = await this.catalogoRepo.updateById(modelo, id, updateData);
    if (!item) {
      throw new ServiceError('Registro no encontrado', 404);
    }
    return item;
  }

  async delete(modelo: string, id: string | number): Promise<any> {
    if (!getModelForCatalogo(modelo)) {
      throw new ServiceError('Modelo no válido', 400);
    }

    const deleted = await this.catalogoRepo.deleteById(modelo, id);
    if (!deleted) {
      throw new ServiceError('Registro no encontrado', 404);
    }
    return null;
  }

  async getNextPedidoNumber(): Promise<number> {
    return getNextPedidoNumber();
  }
}
