import { Request, Response } from 'express';
import { IReportesService } from '../interfaces/services';
import { createResponse } from '../utils/helpers';
import { ServiceError } from '../services/ordenes.service';

export class ReportesController {
  constructor(private reportesService: IReportesService) {}

  private handleError(res: Response, error: any): void {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json(createResponse(false, null, error.message));
      return;
    }
    console.error('Reportes error:', error);
    res.status(500).json(createResponse(false, null, 'Error interno del servidor'));
  }

  getVentas = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fechaInicio, fechaFin } = req.query;
      const result = await this.reportesService.getReporteVentas(
        fechaInicio as string | undefined,
        fechaFin as string | undefined
      );
      res.json(createResponse(true, result));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  getInventario = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.reportesService.getReporteInventario();
      res.json(createResponse(true, result));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  getGastos = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fechaInicio, fechaFin, tipoGasto } = req.query;
      const result = await this.reportesService.getReporteGastos(
        fechaInicio as string | undefined,
        fechaFin as string | undefined,
        tipoGasto as string | undefined
      );
      res.json(createResponse(true, result));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  createGasto = async (req: Request, res: Response): Promise<void> => {
    try {
      const gasto = await this.reportesService.createGasto(req.body);
      res.status(201).json(createResponse(true, gasto, 'Gasto creado exitosamente'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  deleteGasto = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.reportesService.deleteGasto(req.params.id);
      res.json(createResponse(true, null, 'Gasto eliminado exitosamente'));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };

  getProductosVendidos = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fechaInicio, fechaFin, limit = 10 } = req.query;
      const result = await this.reportesService.getProductosVendidos(
        fechaInicio as string | undefined,
        fechaFin as string | undefined,
        parseInt(limit as string)
      );
      res.json(createResponse(true, result));
    } catch (error: any) {
      this.handleError(res, error);
    }
  };
}
