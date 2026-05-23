import path from 'path';
import fs from 'fs';
import { AppSettings } from '../interfaces/config';

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object'
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function loadAppSettings(): AppSettings {
  const basePath = path.resolve(__dirname, '../../appsettings.json');

  // Determine environment: NODE_ENV or default to 'development'
  const env = (process.env.NODE_ENV || 'development').toLowerCase();
  const envPath = path.resolve(__dirname, `../../appsettings.${env}.json`);

  // Load base config
  let fileConfig: any = {};
  if (fs.existsSync(basePath)) {
    fileConfig = JSON.parse(fs.readFileSync(basePath, 'utf-8'));
  }

  // Load environment-specific config and merge (env overrides base)
  if (fs.existsSync(envPath)) {
    const envConfig = JSON.parse(fs.readFileSync(envPath, 'utf-8'));
    fileConfig = deepMerge(fileConfig, envConfig);
    console.log(`📋 Loaded configuration: appsettings.json + appsettings.${env}.json`);
  } else {
    console.log(`📋 Loaded configuration: appsettings.json (no appsettings.${env}.json found)`);
  }

  // Environment variables have highest precedence
  const settings: AppSettings = {
    database: {
      uri: process.env.MONGODB_URI || fileConfig.database?.uri || '',
      options: {
        serverSelectionTimeoutMS:
          parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT || '') ||
          fileConfig.database?.options?.serverSelectionTimeoutMS ||
          30000,
        socketTimeoutMS:
          parseInt(process.env.DB_SOCKET_TIMEOUT || '') ||
          fileConfig.database?.options?.socketTimeoutMS ||
          45000,
      },
      runMigrationsOnStart:
        process.env.RUN_MIGRATIONS_ON_START === 'true' ||
        fileConfig.database?.runMigrationsOnStart ||
        false,
    },
    jwt: {
      secret: process.env.JWT_SECRET || fileConfig.jwt?.secret || '',
      expiresIn: process.env.JWT_EXPIRES_IN || fileConfig.jwt?.expiresIn || '7d',
    },
    server: {
      port: parseInt(process.env.PORT || '') || fileConfig.server?.port || 5000,
    },
  };

  // Validate required fields
  const errors: string[] = [];

  if (!settings.database.uri) {
    errors.push('database.uri is required (set MONGODB_URI env var or database.uri in appsettings.json)');
  }
  if (!settings.jwt.secret) {
    errors.push('jwt.secret is required (set JWT_SECRET env var or jwt.secret in appsettings.json)');
  }

  if (errors.length > 0) {
    throw new Error(
      `❌ Configuration errors:\n${errors.map(e => `  - ${e}`).join('\n')}`
    );
  }

  return settings;
}

export const appSettings: AppSettings = loadAppSettings();
