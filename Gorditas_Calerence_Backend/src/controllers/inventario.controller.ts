import { Request, Response } from 'express';
import { IInventarioService } from '../interfaces/services';
import { createResponse } from '../utils/helpers';
import { ServiceError } from '../services/ordenes.service';

export class InventarioController {
  constructor(private inventarioService: IInventarioService) {}

  private handleError(res: Response, error: any): void {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json(createResponse(false, null, error.message));
      return;
    }
    console.error('Inventario error:', error);
    res.status(500).json(createResponse(false, null, 'Error interno del servidor'));
  }

  getInventario = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tipoProducto, activo, page = 1, limit = 20 } = req.query;

      const filter: any = {};
      if (tipoProducto) filter.idTipoProducto = tipoProducto;
      if (activo !== undefined) filter.activo = activo === 'true';

      const result = await this.inventarioService.getInventario(filter, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });
      res.json(createResponse(true, result));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  recibirProductos = async (req: Request, res: Response): Promise<void> => {
    try {
      const { productos } = req.body;
      const updates = await this.inventarioService.recibirProductos(productos);
      res.json(createResponse(true, updates, `${updates.length} productos actualizados exitosamente`));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  ajustarInventario = async (req: Request, res: Response): Promise<void> => {
    try {
      const { cantidad, motivo } = req.body;
      const producto = await this.inventarioService.ajustarInventario(req.params.id, cantidad, motivo);
      res.json(createResponse(true, producto, 'Inventario ajustado exitosamente'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };
}
