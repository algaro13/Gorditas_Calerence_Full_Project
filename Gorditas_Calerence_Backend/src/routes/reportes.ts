import { Router } from 'express';
import { authenticate, isEncargado } from '../middleware/auth';
import { reportesController } from '../composition-root';

const router = Router();

// GET /api/reportes/ventas
router.get('/ventas', authenticate, isEncargado, reportesController.getVentas);

// GET /api/reportes/inventario
router.get('/inventario', authenticate, isEncargado, reportesController.getInventario);

// GET /api/reportes/gastos
router.get('/gastos', authenticate, isEncargado, reportesController.getGastos);

// POST /api/reportes/gastos
router.post('/gastos', authenticate, isEncargado, reportesController.createGasto);

// DELETE /api/reportes/gastos/:id
router.delete('/gastos/:id', authenticate, isEncargado, reportesController.deleteGasto);

// GET /api/reportes/productos-vendidos
router.get('/productos-vendidos', authenticate, isEncargado, reportesController.getProductosVendidos);

export default router;
