import mongoose from 'mongoose';
import { DatabaseConfig } from '../interfaces/config';

export const connectDB = async (config: DatabaseConfig): Promise<void> => {
  try {
    console.log('🔄 Connecting to MongoDB...');

    await mongoose.connect(config.uri, {
      serverSelectionTimeoutMS: config.options.serverSelectionTimeoutMS,
      socketTimeoutMS: config.options.socketTimeoutMS,
    });

    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('👋 MongoDB connection closed.');
      process.exit(0);
    });

  } catch (error: any) {
    console.error('❌ MongoDB connection error:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);

    if (error.name === 'MongooseServerSelectionError') {
      console.error('\n💡 Posibles soluciones:');
      console.error('1. Verifica que tu IP esté en la lista blanca de MongoDB Atlas');
      console.error('2. Verifica las credenciales en appsettings.json o variables de entorno');
      console.error('3. Verifica tu conexión a internet');
      console.error('4. Verifica que el firewall no esté bloqueando la conexión');
    }

    throw error;
  }
};
