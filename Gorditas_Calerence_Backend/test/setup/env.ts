// Carga .env.test antes de importar cualquier módulo que lea la configuración.
import path from 'node:path';
import dotenv from 'dotenv';

process.env.NODE_ENV = 'test';
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
