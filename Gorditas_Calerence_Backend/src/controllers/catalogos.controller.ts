import { Request, Response } from 'express';
import { ICatalogosService } from '../interfaces/services';
import { createResponse } from '../utils/helpers';
import { ServiceError } from '../services/ordenes.service';

export class CatalogosController {
  constructor(private catalogosService: ICatalogosService) {}

  private handleError(res: Response, error: any): void {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json(createResponse(false, null, error.message));
      return;
    }
    console.error('Catalogos error:', error);
    res.status(500).json(createResponse(false, null, 'Error interno del servidor'));
  }

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const { modelo } = req.params;
      const { page = 1, limit = 20, activo, search } = req.query;

      const filter: any = {};
      if (activo !== undefined) filter.activo = activo === 'true';
      if (search) {
        filter.$or = [
          { nombre: { $regex: search, $options: 'i' } },
          { descripcion: { $regex: search, $options: 'i' } },
        ];
      }

      const result = await this.catalogosService.list(modelo, filter, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });
      res.json(createResponse(true, result));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const { modelo } = req.params;
      const item = await this.catalogosService.create(modelo, req.body);
      res.status(201).json(createResponse(true, item, 'Registro creado exitosamente'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { modelo, id } = req.params;
      const item = await this.catalogosService.update(modelo, id, req.body);
      res.json(createResponse(true, item, 'Registro actualizado exitosamente'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { modelo, id } = req.params;
      await this.catalogosService.delete(modelo, id);
      res.json(createResponse(true, null, 'Registro eliminado exitosamente'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  getNextPedidoNumber = async (req: Request, res: Response): Promise<void> => {
    try {
      const nextNumber = await this.catalogosService.getNextPedidoNumber();
      res.json(createResponse(true, { nextNumber }, 'Siguiente número de pedido obtenido'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };
}
