import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import mongoose from 'mongoose';
import Usuario from './models/Usuario';

// Routes
import authRoutes from './routes/auth';
import ordenesRoutes from './routes/ordenes';
import inventarioRoutes from './routes/inventario';
import reportesRoutes from './routes/reportes';
import catalogosRoutes from './routes/catalogos';
import { streamEventos, emitirCambioTrasMutacion } from './realtime/eventos';
import Mesa from './models/Mesa';
import Orden from './models/Orden';
dotenv.config();

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
const PORT = process.env.PORT;

// Connect to MongoDB
connectDB();
// Middleware
app.use(helmet());

// CORS configuration - Permitir todos los orígenes
const corsOptions = {
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
};

app.use(cors(corsOptions));
//app.use(morgan('combined'));  //Depuracion
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Canal de tiempo real (SSE): avisa a las pantallas que algo cambió para que vuelvan a consultar.
app.get('/api/eventos', streamEventos);

// Routes
app.use('/api/auth', authRoutes);
// Tras cada mutación exitosa de órdenes/inventario, se emite una señal de cambio por SSE.
app.use('/api/ordenes', emitirCambioTrasMutacion('ordenes'), ordenesRoutes);
app.use('/api/inventario', emitirCambioTrasMutacion('inventario'), inventarioRoutes);
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
  await ensureAdminUser();
  console.log(`Server running on port ${PORT}`);

  console.log(`API documentation available at http://localhost:${PORT}/api/auth`);
});

export default app;