import { Router } from 'express';
import { authenticate, isEncargado } from '../middleware/auth';
import { inventarioController } from '../composition-root';

const router = Router();

// GET /api/inventario
router.get('/', authenticate, inventarioController.getInventario);

// POST /api/inventario/recibir
router.post('/recibir', authenticate, isEncargado, inventarioController.recibirProductos);

// PUT /api/inventario/ajustar/:id
router.put('/ajustar/:id', authenticate, isEncargado, inventarioController.ajustarInventario);

export default router;
