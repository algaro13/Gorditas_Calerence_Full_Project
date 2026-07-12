import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { hybridAuth, HybridAuthRequest } from '../middleware/hybrid-auth';
import { getTenantModel, getTenantUserModel } from '../config/master-db';
import { getTenantConnection } from '../config/tenant-connection';
import { createResponse } from '../utils/helpers';

const router = Router();

// Multer config for image uploads — always save to temp first
const storage = multer.diskStorage({
  destination: (req: any, file, cb) => {
    const dir = path.resolve(__dirname, '../../uploads/temp');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no válido. Use JPG, PNG o WebP.'));
    }
  },
});

// POST /api/onboarding/upload-image
router.post('/upload-image', hybridAuth, upload.single('image'), (req: HybridAuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json(createResponse(false, null, 'No se recibió imagen'));
    }

    const slug = req.body.slug || 'temp';
    const ext = path.extname(req.file.originalname);
    const finalDir = path.resolve(__dirname, `../../uploads/${slug}`);
    const finalPath = path.join(finalDir, `logo${ext}`);

    // Move file from temp to the slug directory
    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
    }
    fs.renameSync(req.file.path, finalPath);

    const url = `/uploads/${slug}/logo${ext}`;
    res.json(createResponse(true, { url, filename: `logo${ext}` }));
  } catch (error: any) {
    res.status(400).json(createResponse(false, null, error.message || 'Error al subir imagen'));
  }
});

// POST /api/onboarding/complete — Complete the onboarding wizard
router.post('/complete', hybridAuth, async (req: HybridAuthRequest, res: Response) => {
  try {
    const { nombre, slug, paleta, imagen, mesas, platillos, guisos } = req.body;

    if (!nombre || !slug) {
      return res.status(400).json(createResponse(false, null, 'Nombre y slug son requeridos'));
    }

    // Validate slug
    const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (!slugRegex.test(slug) || slug.length < 3 || slug.length > 50) {
      return res.status(400).json(createResponse(false, null, 'Slug inválido'));
    }

    const Tenant = getTenantModel();
    const TenantUser = getTenantUserModel();

    // Check slug availability
    const existing = await Tenant.findOne({ slug });
    if (existing) {
      return res.status(409).json(createResponse(false, null, 'Este nombre ya está en uso'));
    }

    // Check user doesn't already have a tenant
    const existingUser = await TenantUser.findOne({ entraOid: req.entraUser!.oid });
    if (existingUser) {
      return res.status(409).json(createResponse(false, null, 'Ya tienes un negocio registrado'));
    }

    // Create tenant
    const dbName = `pos_${slug.replace(/-/g, '_')}`;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const tenant = new Tenant({
      slug,
      nombre,
      dbName,
      plan: 'trial',
      planStatus: 'trial',
      trialEndsAt,
      maxUsuarios: 3,
      activo: true,
      config: {
        paleta: paleta || 'orange',
        imagen: imagen || null,
      },
    });
    await tenant.save();

    // Provision database
    const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/default';
    const connection = getTenantConnection(dbName, baseUri);

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      if (connection.readyState === 1) resolve();
      else {
        connection.once('connected', resolve);
        connection.once('error', reject);
        setTimeout(() => resolve(), 3000); // Timeout fallback
      }
    });

    const db = connection.db;

    // Create indexes
    await db.collection('ordens').createIndex({ folio: 1 }, { unique: true, background: true });
    await db.collection('ordens').createIndex({ estatus: 1 }, { background: true });
    await db.collection('ordens').createIndex({ fechaHora: -1 }, { background: true });
    await db.collection('ordens').createIndex({ idMesa: 1 }, { background: true });
    await db.collection('productos').createIndex({ nombre: 1 }, { background: true });
    await db.collection('subordens').createIndex({ idOrden: 1 }, { background: true });

    // Create mesas
    const numMesasCreated = mesas && mesas.length > 0 ? mesas.length : 5;
    if (mesas && mesas.length > 0) {
      const mesaDocs = mesas.map((mesa: any, i: number) => ({
        _id: i + 1,
        nombre: mesa.nombre || `Mesa ${i + 1}`,
        activo: true,
      }));
      await db.collection('mesas').insertMany(mesaDocs);
    }

    // Create guisos
    if (guisos && guisos.length > 0) {
      const guisoDocs = guisos.map((g: any, i: number) => ({
        _id: i + 1,
        nombre: g.nombre || g,
        activo: true,
      }));
      await db.collection('guisos').insertMany(guisoDocs);
    }

    // Create platillos
    if (platillos && platillos.length > 0) {
      const platilloDocs = platillos.map((p: any, i: number) => ({
        _id: i + 1,
        nombre: p.nombre,
        costo: p.precio || p.costo || 0,
        idTipoPlatillo: 1,
        nombreTipoPlatillo: 'Gorditas',
        activo: true,
      }));
      await db.collection('platillos').insertMany(platilloDocs);
    }

    // Create counter for folios
    await db.collection('counters').insertOne({ _id: 'orden', sequence_value: 0 });

    // Create default "Nuevo pedido" mesa for to-go orders
    await db.collection('mesas').insertOne({ _id: numMesasCreated + 1, nombre: 'Nuevo pedido' });

    // ─── TIPOS DE PLATILLO ─────────────────────────────────────────────
    await db.collection('tipoplatillos').insertMany([
      { _id: 1, nombre: 'Gorditas', descripcion: 'Gorditas de maíz rellenas', activo: true },
      { _id: 2, nombre: 'Quesadillas', descripcion: 'Quesadillas de harina o maíz', activo: true },
      { _id: 3, nombre: 'Tacos', descripcion: 'Tacos dorados o suaves', activo: true },
      { _id: 4, nombre: 'Tortas', descripcion: 'Tortas y cemitas', activo: true },
      { _id: 5, nombre: 'Otros', descripcion: 'Otros platillos', activo: true },
    ]);

    // ─── TIPOS DE PRODUCTO ─────────────────────────────────────────────
    await db.collection('tipoproductos').insertMany([
      { _id: 1, nombre: 'Bebidas', descripcion: 'Refrescos, aguas, jugos', activo: true },
      { _id: 2, nombre: 'Postres', descripcion: 'Postres y dulces', activo: true },
      { _id: 3, nombre: 'Complementos', descripcion: 'Salsas, tortillas extra, aderezos', activo: true },
      { _id: 4, nombre: 'Snacks', descripcion: 'Frituras, dulces empaquetados', activo: true },
    ]);

    // ─── PRODUCTOS DE EJEMPLO ──────────────────────────────────────────
    await db.collection('productos').insertMany([
      { _id: 1, nombre: 'Coca-Cola 600ml', idTipoProducto: 1, nombreTipoProducto: 'Bebidas', cantidad: 24, costo: 18, activo: true },
      { _id: 2, nombre: 'Agua natural 600ml', idTipoProducto: 1, nombreTipoProducto: 'Bebidas', cantidad: 24, costo: 12, activo: true },
      { _id: 3, nombre: 'Jarritos 600ml', idTipoProducto: 1, nombreTipoProducto: 'Bebidas', cantidad: 12, costo: 15, activo: true },
    ]);

    // ─── TIPOS DE EXTRA ────────────────────────────────────────────────
    await db.collection('tipoextras').insertMany([
      { _id: 1, nombre: 'Ingredientes extra', descripcion: 'Queso, crema, aguacate, cebolla', activo: true },
      { _id: 2, nombre: 'Salsas', descripcion: 'Salsas adicionales', activo: true },
    ]);

    // ─── EXTRAS DE EJEMPLO ─────────────────────────────────────────────
    await db.collection('extras').insertMany([
      { _id: 1, nombre: 'Queso extra', costo: 10, idTipoExtra: 1, activo: true },
      { _id: 2, nombre: 'Crema', costo: 5, idTipoExtra: 1, activo: true },
      { _id: 3, nombre: 'Aguacate', costo: 15, idTipoExtra: 1, activo: true },
      { _id: 4, nombre: 'Salsa verde extra', costo: 5, idTipoExtra: 2, activo: true },
      { _id: 5, nombre: 'Salsa roja extra', costo: 5, idTipoExtra: 2, activo: true },
    ]);

    // ─── TIPOS DE GASTO ────────────────────────────────────────────────
    await db.collection('tipogastos').insertMany([
      { _id: 1, nombre: 'Insumos', activo: true },
      { _id: 2, nombre: 'Servicios', activo: true },
      { _id: 3, nombre: 'Nómina', activo: true },
      { _id: 4, nombre: 'Mantenimiento', activo: true },
      { _id: 5, nombre: 'Otros', activo: true },
    ]);

    // ─── TIPOS DE ORDEN ────────────────────────────────────────────────
    await db.collection('tipoordens').insertMany([
      { _id: 1, nombre: 'En mesa', activo: true },
      { _id: 2, nombre: 'Para llevar', activo: true },
      { _id: 3, nombre: 'Domicilio', activo: true },
    ]);

    // ─── TIPOS DE USUARIO ──────────────────────────────────────────────
    await db.collection('tipousuarios').insertMany([
      { _id: 1, nombre: 'Admin', descripcion: 'Acceso completo al sistema' },
      { _id: 2, nombre: 'Encargado', descripcion: 'Gestión de catálogos, inventario y reportes' },
      { _id: 3, nombre: 'Mesero', descripcion: 'Crear órdenes, cobrar, despachar' },
      { _id: 4, nombre: 'Despachador', descripcion: 'Surtir y despachar órdenes' },
      { _id: 5, nombre: 'Cocinero', descripcion: 'Ver órdenes en preparación' },
    ]);

    // Assign user as Admin
    const tenantUser = new TenantUser({
      entraOid: req.entraUser!.oid,
      tenantId: tenant._id.toString(),
      email: req.entraUser!.email,
      nombre: req.entraUser!.name || nombre,
      role: 'Admin',
      activo: true,
    });
    await tenantUser.save();

    console.log(`✅ Onboarding complete: ${slug} (${dbName})`);

    res.status(201).json(createResponse(true, {
      tenant: {
        slug: tenant.slug,
        nombre: tenant.nombre,
        url: `pos-${slug}.kustodela.com`,
        config: tenant.config,
      },
      user: { email: tenantUser.email, role: tenantUser.role },
    }, 'Negocio registrado exitosamente'));
  } catch (error: any) {
    console.error('Onboarding error:', error);
    res.status(500).json(createResponse(false, null, 'Error al completar el registro'));
  }
});

export default router;
