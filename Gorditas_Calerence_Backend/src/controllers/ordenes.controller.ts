import { Request, Response } from 'express';
import { IOrdenesService } from '../interfaces/services';
import { createResponse } from '../utils/helpers';
import { ServiceError } from '../services/ordenes.service';

export class OrdenesController {
  constructor(private ordenesService: IOrdenesService) {}

  private handleError(res: Response, error: any): void {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json(createResponse(false, null, error.message));
      return;
    }
    console.error('Ordenes error:', error);
    res.status(500).json(createResponse(false, null, 'Error interno del servidor'));
  }

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const { estatus, estatusNo, mesa, fecha, page = 1, limit = 10 } = req.query;

      const filter: any = {};
      if (estatus) filter.estatus = estatus;
      if (estatusNo) {
        const excluidos = String(estatusNo).split(',').map(s => s.trim());
        filter.estatus = { $nin: excluidos };
      }
      if (mesa) filter.idMesa = mesa;
      if (fecha) {
        const startDate = new Date(fecha as string);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        filter.fechaHora = { $gte: startDate, $lt: endDate };
      }

      const result = await this.ordenesService.listOrdenes(filter, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });
      res.json(createResponse(true, result));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.ordenesService.getOrdenById(req.params.id);
      res.json(createResponse(true, result));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const orden = await this.ordenesService.createOrden(req.body);
      res.status(201).json(createResponse(true, orden, 'Orden creada exitosamente'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  createSuborden = async (req: Request, res: Response): Promise<void> => {
    try {
      const { nombre } = req.body;
      const suborden = await this.ordenesService.createSuborden(req.params.id, nombre);
      res.status(201).json(createResponse(true, suborden, 'Suborden creada exitosamente'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  addProducto = async (req: Request, res: Response): Promise<void> => {
    try {
      const detalle = await this.ordenesService.addProducto(req.params.id, req.body);
      res.status(201).json(createResponse(true, detalle, 'Producto agregado exitosamente'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  addPlatillo = async (req: Request, res: Response): Promise<void> => {
    try {
      const detalle = await this.ordenesService.addPlatillo(req.params.id, req.body);
      res.status(201).json(createResponse(true, detalle, 'Platillo agregado exitosamente'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  addExtra = async (req: Request, res: Response): Promise<void> => {
    try {
      const detalle = await this.ordenesService.addExtra(req.params.id, req.body);
      res.status(201).json(createResponse(true, detalle, 'Extra agregado exitosamente'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  changeEstatus = async (req: any, res: Response): Promise<void> => {
    try {
      const { estatus } = req.body;
      const userRole = req.user.nombreTipoUsuario;
      const orden = await this.ordenesService.changeEstatus(req.params.id, estatus, userRole);
      res.json(createResponse(true, orden, 'Estatus actualizado exitosamente'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  updateFechaHora = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fechaHora } = req.body;
      const orden = await this.ordenesService.updateFechaHora(req.params.id, fechaHora);
      res.json(createResponse(true, orden, 'Fecha y hora actualizada exitosamente'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  verificar = async (req: Request, res: Response): Promise<void> => {
    try {
      const { isComplete } = req.body;
      const orden = await this.ordenesService.verificarOrden(req.params.id, isComplete);
      const message = isComplete
        ? 'Orden verificada y enviada a preparación'
        : 'Orden marcada como pendiente para revisión';
      res.json(createResponse(true, orden, message));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  markProductoListo = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ordenesService.markProductoListo(req.params.id);
      res.json(createResponse(true, null, 'Producto marcado como listo'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  markPlatilloListo = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ordenesService.markPlatilloListo(req.params.id);
      res.json(createResponse(true, null, 'Platillo marcado como listo'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  markExtraListo = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ordenesService.markExtraListo(req.params.id);
      res.json(createResponse(true, null, 'Extra marcado como listo'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  markProductoEntregado = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ordenesService.markProductoEntregado(req.params.id);
      res.json(createResponse(true, null, 'Producto marcado como entregado'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  markPlatilloEntregado = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ordenesService.markPlatilloEntregado(req.params.id);
      res.json(createResponse(true, null, 'Platillo marcado como entregado'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  markExtraEntregado = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ordenesService.markExtraEntregado(req.params.id);
      res.json(createResponse(true, null, 'Extra marcado como entregado'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  updateExtraEstatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { estatus } = req.body;
      const extra = await this.ordenesService.updateExtraEstatus(req.params.id, estatus);
      res.json(createResponse(true, extra));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  updatePlatilloNota = async (req: Request, res: Response): Promise<void> => {
    try {
      const { notas } = req.body;
      await this.ordenesService.updatePlatilloNota(req.params.id, notas);
      res.json(createResponse(true, null, 'Nota del platillo actualizada exitosamente'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  deletePlatillo = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ordenesService.deletePlatillo(req.params.id);
      res.json(createResponse(true, null, 'Platillo eliminado exitosamente'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  deleteProducto = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ordenesService.deleteProducto(req.params.id);
      res.json(createResponse(true, null, 'Producto eliminado exitosamente'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  deleteExtra = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ordenesService.deleteExtra(req.params.id);
      res.json(createResponse(true, null, 'Extra eliminado exitosamente'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  deleteOrden = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ordenesService.deleteOrden(req.params.id);
      res.json(createResponse(true, null, 'Orden eliminada exitosamente'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };
}
