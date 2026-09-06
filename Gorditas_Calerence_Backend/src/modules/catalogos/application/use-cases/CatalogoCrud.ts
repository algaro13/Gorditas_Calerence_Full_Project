import type { UnitOfWork } from '../../../../shared/application/ports/UnitOfWork';
import { NotFoundError } from '../../../../shared/domain/DomainError';
import type { CatalogoDef } from '../../domain/registry';
import type { CatalogoListFilter, CatalogoRepository, CatalogoRow } from '../ports/CatalogoRepository';

export class ListarCatalogo {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly repo: CatalogoRepository,
  ) {}
  execute(def: CatalogoDef, filter: CatalogoListFilter, page: { skip: number; take: number }) {
    return this.uow.run(() => this.repo.list(def, filter, page));
  }
}

export class CrearRegistro {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly repo: CatalogoRepository,
  ) {}
  execute(def: CatalogoDef, data: Record<string, unknown>): Promise<CatalogoRow> {
    return this.uow.run(() => this.repo.create(def, data));
  }
}

export class ActualizarRegistro {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly repo: CatalogoRepository,
  ) {}
  execute(def: CatalogoDef, id: number, data: Record<string, unknown>): Promise<CatalogoRow> {
    return this.uow.run(async () => {
      const row = await this.repo.update(def, id, data);
      if (!row) throw new NotFoundError('Registro no encontrado', 'REGISTRO_NOT_FOUND');
      return row;
    });
  }
}

export class EliminarRegistro {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly repo: CatalogoRepository,
  ) {}
  execute(def: CatalogoDef, id: number): Promise<void> {
    return this.uow.run(async () => {
      const ok = await this.repo.delete(def, id);
      if (!ok) throw new NotFoundError('Registro no encontrado', 'REGISTRO_NOT_FOUND');
    });
  }
}
