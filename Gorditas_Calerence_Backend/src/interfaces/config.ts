export interface DatabaseConfig {
  uri: string;
  options: {
    serverSelectionTimeoutMS: number;
    socketTimeoutMS: number;
  };
  runMigrationsOnStart: boolean;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export interface ServerConfig {
  port: number;
}

export interface AppSettings {
  database: DatabaseConfig;
  jwt: JwtConfig;
  server: ServerConfig;
}
