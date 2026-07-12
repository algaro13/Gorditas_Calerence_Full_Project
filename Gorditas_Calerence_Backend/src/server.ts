import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/database';
import { connectMasterDB } from './config/master-db';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import Usuario from './models/Usuario';

// Routes
import authRoutes from './routes/auth';
import ordenesRoutes from './routes/ordenes';
import inventarioRoutes from './routes/inventario';
import reportesRoutes from './routes/reportes';
import catalogosRoutes from './routes/catalogos';
import tenantsRoutes from './routes/tenants';
import billingRoutes from './routes/billing';
import onboardingRoutes from './routes/onboarding';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mi_tienda_gorditas';
const MASTER_DB_URI = process.env.MASTER_DB_URI || 'mongodb://localhost:27017/kustodela_master';
const PORT = process.env.PORT || 5000;

async function ensureAdminUser() {
  const adminEmail = 'encargado@gorditas.com';
  const adminExists = await Usuario.findOne({ email: adminEmail });
  if (!adminExists) {
    const admin = new Usuario({
      nombre: 'Encargado',
      email: adminEmail,
      password: 'encargado123',
      idTipoUsuario: 1,
      nombreTipoUsuario: 'Admin',
      activo: true
    });
    await admin.save();
    console.log('✅ Usuario encargado creado automáticamente');
  } else {
    console.log('ℹ️  Usuario encargado ya existe');
  }
}

const app = express();

// Serve uploaded images (before helmet to avoid CORP blocking)
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static('uploads'));

// Middleware
app.use(helmet());

const corsOptions = {
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Tenant-Slug'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Tenant management routes (no tenant resolution needed)
app.use('/api/tenants', tenantsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/onboarding', onboardingRoutes);

// POS routes (existing - with plan guard and tenant DB switching)
import { planGuard } from './middleware/plan-guard';
import { tenantModelsMiddleware } from './middleware/tenant-models-middleware';
import { hybridAuth } from './middleware/hybrid-auth';

// Apply auth + tenant switch + plan guard BEFORE each POS route group
const posMiddleware = [hybridAuth, tenantModelsMiddleware, planGuard];

app.use('/api/auth', authRoutes);
app.use('/api/ordenes', posMiddleware, ordenesRoutes);
app.use('/api/inventario', posMiddleware, inventarioRoutes);
app.use('/api/reportes', posMiddleware, reportesRoutes);
app.use('/api/catalogos', posMiddleware, catalogosRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

async function startServer() {
  try {
    // Connect to MongoDB (default connection - used as base for useDb)
    await connectDB();

    // Connect to Master DB (for tenant management)
    await connectMasterDB(MASTER_DB_URI);

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📋 Tenant API: http://localhost:${PORT}/api/tenants`);
      console.log(`📋 POS API: http://localhost:${PORT}/api/auth`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
