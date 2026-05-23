import { Router } from 'express';
import { authenticate, isMesero } from '../middleware/auth';
import {
  validate,
  createOrdenSchema,
  addProductToOrdenSchema,
  addPlatilloToSubordenSchema,
  addExtraToOrdenSchema,
} from '../middleware/validation';
import { ordenesController } from '../composition-root';

const router = Router();

// PUT /api/ordenes/extra/:id/estatus
router.put('/extra/:id/estatus', authenticate, ordenesController.updateExtraEstatus);

// GET /api/ordenes
router.get('/', authenticate, ordenesController.list);

// GET /api/ordenes/:id
router.get('/:id', authenticate, ordenesController.getById);

// POST /api/ordenes/nueva
router.post('/nueva', authenticate, validate(createOrdenSchema), ordenesController.create);

// POST /api/ordenes/:id/suborden
router.post('/:id/suborden', authenticate, ordenesController.createSuborden);

// POST /api/ordenes/suborden/:id/platillo
router.post('/suborden/:id/platillo', authenticate, validate(addPlatilloToSubordenSchema), ordenesController.addPlatillo);

// POST /api/ordenes/:id/producto
router.post('/:id/producto', authenticate, validate(addProductToOrdenSchema), ordenesController.addProducto);

// POST /api/ordenes/platillo/:id/extra
router.post('/platillo/:id/extra', authenticate, validate(addExtraToOrdenSchema), ordenesController.addExtra);

// PUT /api/ordenes/:id/estatus
router.put('/:id/estatus', authenticate, ordenesController.changeEstatus);

// PUT /api/ordenes/:id/fecha-hora
router.put('/:id/fecha-hora', authenticate, ordenesController.updateFechaHora);

// PUT /api/ordenes/:id/verificar
router.put('/:id/verificar', authenticate, isMesero, ordenesController.verificar);

// PUT /api/ordenes/producto/:id/listo
router.put('/producto/:id/listo', authenticate, ordenesController.markProductoListo);

// PUT /api/ordenes/platillo/:id/listo
router.put('/platillo/:id/listo', authenticate, ordenesController.markPlatilloListo);

// PUT /api/ordenes/producto/:id/entregado
router.put('/producto/:id/entregado', authenticate, ordenesController.markProductoEntregado);

// PUT /api/ordenes/platillo/:id/entregado
router.put('/platillo/:id/entregado', authenticate, ordenesController.markPlatilloEntregado);

// PUT /api/ordenes/platillo/:id/nota
router.put('/platillo/:id/nota', authenticate, ordenesController.updatePlatilloNota);

// PUT /api/ordenes/extra/:id/listo
router.put('/extra/:id/listo', authenticate, ordenesController.markExtraListo);

// PUT /api/ordenes/extra/:id/entregado
router.put('/extra/:id/entregado', authenticate, ordenesController.markExtraEntregado);

// DELETE /api/ordenes/platillo/:id
router.delete('/platillo/:id', authenticate, ordenesController.deletePlatillo);

// DELETE /api/ordenes/producto/:id
router.delete('/producto/:id', authenticate, ordenesController.deleteProducto);

// DELETE /api/ordenes/extra/:id
router.delete('/extra/:id', authenticate, ordenesController.deleteExtra);

// DELETE /api/ordenes/:id
router.delete('/:id', authenticate, ordenesController.deleteOrden);

export default router;
