import { Request } from 'express';
import * as globalModels from '../models';

/**
 * Gets the correct models for the current request.
 * If the request has a tenant connection (multi-tenant), uses tenant-specific models.
 * Otherwise falls back to the global models (legacy single-tenant mode).
 */
export function getModels(req: any) {
  if (req.tenantModels) {
    return {
      Orden: req.tenantModels.Orden || req.tenantConnection?.model('Orden'),
      Suborden: req.tenantModels.Suborden || req.tenantConnection?.model('Suborden'),
      OrdenDetalleProducto: req.tenantModels.OrdenDetalleProducto || req.tenantConnection?.model('OrdenDetalleProducto'),
      OrdenDetallePlatillo: req.tenantModels.OrdenDetallePlatillo || req.tenantConnection?.model('OrdenDetallePlatillo'),
      OrdenDetalleExtra: req.tenantModels.OrdenDetalleExtra || req.tenantConnection?.model('OrdenDetalleExtra'),
      Producto: req.tenantModels.Producto || req.tenantConnection?.model('Producto'),
      Guiso: req.tenantModels.Guiso || req.tenantConnection?.model('Guiso'),
      TipoProducto: req.tenantModels.TipoProducto || req.tenantConnection?.model('TipoProducto'),
      TipoPlatillo: req.tenantModels.TipoPlatillo || req.tenantConnection?.model('TipoPlatillo'),
      Platillo: req.tenantModels.Platillo || req.tenantConnection?.model('Platillo'),
      TipoExtra: req.tenantModels.TipoExtra || req.tenantConnection?.model('TipoExtra'),
      Extra: req.tenantModels.Extra || req.tenantConnection?.model('Extra'),
      TipoUsuario: req.tenantModels.TipoUsuario || req.tenantConnection?.model('TipoUsuario'),
      Usuario: req.tenantModels.Usuario || req.tenantConnection?.model('Usuario'),
      TipoOrden: req.tenantModels.TipoOrden || req.tenantConnection?.model('TipoOrden'),
      Mesa: req.tenantModels.Mesa || req.tenantConnection?.model('Mesa'),
      TipoGasto: req.tenantModels.TipoGasto || req.tenantConnection?.model('TipoGasto'),
      Gasto: req.tenantModels.Gasto || req.tenantConnection?.model('Gasto'),
      Counter: req.tenantModels.Counter || req.tenantConnection?.model('Counter'),
    };
  }

  // Fallback to global models (legacy)
  return globalModels;
}
