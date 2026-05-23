import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
dotenv.config();

import { appSettings } from './composition-root';
import { connectDB } from './config/database';
import { runPendingMigrations } from './config/migrations';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import Usuario from './models/Usuario';

// Routes
import authRoutes from './routes/auth';
import ordenesRoutes from './routes/ordenes';
import inventarioRoutes from './routes/inventario';
import reportesRoutes from './routes/reportes';
import catalogosRoutes from './routes/catalogos';

async function ensureAdminUser() {
  const adminEmail = 'Encargado@gorditas.com';
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
    console.log(' Usuario encargado creado automáticamente');
  } else {
    console.log('ℹ Usuario encargado ya existe');
  }
}

const app = express();
const PORT = appSettings.server.port;

// Connect to MongoDB using centralized config
connectDB(appSettings.database);

// Middleware
app.use(helmet());

const corsOptions = {
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ordenes', ordenesRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/catalogos', catalogosRoutes);

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

app.listen(PORT, async () => {
  // Run pending migrations if configured
  if (appSettings.database.runMigrationsOnStart) {
    try {
      await runPendingMigrations();
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  }

  await ensureAdminUser();
  console.log(`Server running on port ${PORT}`);
  console.log(`API documentation available at http://localhost:${PORT}/api/auth`);
});

export default app;
