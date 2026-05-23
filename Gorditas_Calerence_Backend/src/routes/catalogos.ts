import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { catalogosController } from '../composition-root';

const router = Router();

// GET /api/catalogos/pedido/next-number (must be before /:modelo to avoid conflict)
router.get('/pedido/next-number', authenticate, catalogosController.getNextPedidoNumber);

// GET /api/catalogos/:modelo
router.get('/:modelo', authenticate, catalogosController.list);

// POST /api/catalogos/:modelo
router.post('/:modelo', authenticate, catalogosController.create);

// PUT /api/catalogos/:modelo/:id
router.put('/:modelo/:id', authenticate, catalogosController.update);

// DELETE /api/catalogos/:modelo/:id
router.delete('/:modelo/:id', authenticate, catalogosController.delete);

export default router;
