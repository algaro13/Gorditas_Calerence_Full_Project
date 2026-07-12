import { Router, Request, Response } from 'express';
import { hybridAuth, HybridAuthRequest } from '../middleware/hybrid-auth';
import { getTenantModel, getTenantUserModel } from '../config/master-db';
import { getTenantConnection } from '../config/tenant-connection';
import { createResponse } from '../utils/helpers';

const router = Router();

// POST /api/tenants/register — Register a new tenant
router.post('/register', hybridAuth, async (req: HybridAuthRequest, res: Response) => {
  try {
    const { nombre, slug } = req.body;

    if (!nombre || !slug) {
      return res.status(400).json(createResponse(false, null, 'Nombre y slug son requeridos'));
    }

    // Validate slug format (lowercase, alphanumeric + hyphens)
    const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (!slugRegex.test(slug) || slug.length < 3 || slug.length > 50) {
      return res.status(400).json(createResponse(false, null, 'Slug inválido. Use 3-50 caracteres, solo letras minúsculas, números y guiones.'));
    }

    const Tenant = getTenantModel();
    const TenantUser = getTenantUserModel();

    // Check if slug is available
    const existing = await Tenant.findOne({ slug });
    if (existing) {
      return res.status(409).json(createResponse(false, null, 'Este nombre ya está en uso'));
    }

    // Check if user already has a tenant
    const existingUser = await TenantUser.findOne({ entraOid: req.entraUser!.oid });
    if (existingUser) {
      return res.status(409).json(createResponse(false, null, 'Ya tienes un negocio registrado'));
    }

    // Create tenant
    const dbName = `pos_${slug.replace(/-/g, '_')}`;
    const tenant = new Tenant({
      slug,
      nombre,
      dbName,
      plan: 'trial',
      activo: true,
      config: { paleta: 'orange' },
    });
    await tenant.save();

    // Provision database (create indexes)
    await provisionDatabase(dbName);

    // Assign user as admin of the tenant
    const tenantUser = new TenantUser({
      entraOid: req.entraUser!.oid,
      tenantId: tenant._id.toString(),
      email: req.entraUser!.email,
      nombre: req.entraUser!.name || nombre,
      role: 'Admin',
      activo: true,
    });
    await tenantUser.save();

    res.status(201).json(createResponse(true, {
      tenant: { slug: tenant.slug, nombre: tenant.nombre, url: `pos-${slug}.kustodela.com` },
      user: { email: tenantUser.email, role: tenantUser.role },
    }, 'Negocio registrado exitosamente'));
  } catch (error: any) {
    console.error('Register tenant error:', error);
    res.status(500).json(createResponse(false, null, 'Error al registrar negocio'));
  }
});

// GET /api/tenants/check-slug/:slug — Check slug availability
router.get('/check-slug/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const Tenant = getTenantModel();
    const existing = await Tenant.findOne({ slug: slug.toLowerCase() });

    res.json(createResponse(true, {
      slug: slug.toLowerCase(),
      available: !existing,
      url: `pos-${slug.toLowerCase()}.kustodela.com`,
    }));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Error al verificar disponibilidad'));
  }
});

// GET /api/tenants/me — Get current user's tenant info
router.get('/me', hybridAuth, async (req: HybridAuthRequest, res: Response) => {
  try {
    const TenantUser = getTenantUserModel();
    const Tenant = getTenantModel();

    const tenantUser = await TenantUser.findOne({ entraOid: req.entraUser!.oid });
    if (!tenantUser) {
      return res.status(404).json(createResponse(false, null, 'No tienes un negocio registrado'));
    }

    const tenant = await Tenant.findById(tenantUser.tenantId);
    if (!tenant) {
      return res.status(404).json(createResponse(false, null, 'Tenant no encontrado'));
    }

    res.json(createResponse(true, {
      tenant: {
        slug: tenant.slug,
        nombre: tenant.nombre,
        plan: tenant.plan,
        activo: tenant.activo,
        config: tenant.config,
        url: `pos-${tenant.slug}.kustodela.com`,
      },
      user: {
        email: tenantUser.email,
        nombre: tenantUser.nombre,
        role: tenantUser.role,
      },
    }));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Error al obtener información del tenant'));
  }
});

// GET /api/tenants/me/profile — Get user profile within their tenant
router.get('/me/profile', hybridAuth, async (req: HybridAuthRequest, res: Response) => {
  try {
    const TenantUser = getTenantUserModel();
    const tenantUser = await TenantUser.findOne({ entraOid: req.entraUser!.oid });

    if (!tenantUser) {
      return res.status(404).json(createResponse(false, null, 'Perfil no encontrado'));
    }

    res.json(createResponse(true, {
      _id: tenantUser._id,
      nombre: tenantUser.nombre,
      email: tenantUser.email,
      idTipoUsuario: 1,
      nombreTipoUsuario: tenantUser.role,
      activo: tenantUser.activo,
    }));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Error al obtener perfil'));
  }
});

// PUT /api/tenants/me/config — Update tenant configuration (palette, image)
router.put('/me/config', hybridAuth, async (req: HybridAuthRequest, res: Response) => {
  try {
    const { paleta, imagen } = req.body;
    const TenantUser = getTenantUserModel();
    const Tenant = getTenantModel();

    const tenantUser = await TenantUser.findOne({ entraOid: req.entraUser!.oid });
    if (!tenantUser) {
      return res.status(404).json(createResponse(false, null, 'Tenant no encontrado'));
    }

    const tenant = await Tenant.findById(tenantUser.tenantId);
    if (!tenant) {
      return res.status(404).json(createResponse(false, null, 'Tenant no encontrado'));
    }

    // Update config
    if (paleta) tenant.config.paleta = paleta;
    if (imagen !== undefined) tenant.config.imagen = imagen;
    await tenant.save();

    res.json(createResponse(true, { config: tenant.config }, 'Configuración actualizada'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Error al actualizar configuración'));
  }
});

// Helper: Provision a new tenant database with base indexes
async function provisionDatabase(dbName: string): Promise<void> {
  const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/default';
  const connection = getTenantConnection(dbName, baseUri);

  // Wait for connection
  await new Promise<void>((resolve, reject) => {
    if (connection.readyState === 1) {
      resolve();
    } else {
      connection.once('connected', resolve);
      connection.once('error', reject);
    }
  });

  const db = connection.db;

  // Create collections with indexes (same as baseline migration)
  await db.collection('ordens').createIndex({ folio: 1 }, { unique: true, background: true });
  await db.collection('ordens').createIndex({ estatus: 1 }, { background: true });
  await db.collection('ordens').createIndex({ fechaHora: -1 }, { background: true });
  await db.collection('ordens').createIndex({ idMesa: 1 }, { background: true });
  await db.collection('usuarios').createIndex({ email: 1 }, { unique: true, sparse: true, background: true });
  await db.collection('productos').createIndex({ nombre: 1 }, { background: true });
  await db.collection('productos').createIndex({ idTipoProducto: 1 }, { background: true });
  await db.collection('subordens').createIndex({ idOrden: 1 }, { background: true });
  await db.collection('ordendetalleproductos').createIndex({ idOrden: 1 }, { background: true });
  await db.collection('ordendetalleplatillos').createIndex({ idSuborden: 1 }, { background: true });
  await db.collection('ordendetalleextras').createIndex({ idOrdenDetallePlatillo: 1 }, { background: true });
  await db.collection('gastos').createIndex({ fecha: -1 }, { background: true });
  await db.collection('gastos').createIndex({ idTipoGasto: 1 }, { background: true });

  console.log(`✅ Database provisioned: ${dbName}`);
}

export default router;


