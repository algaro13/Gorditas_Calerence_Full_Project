import mongoose from 'mongoose';

// Cache of tenant database connections
const connectionCache = new Map<string, mongoose.Connection>();

export function getTenantConnection(dbName: string, baseUri: string): mongoose.Connection {
  if (connectionCache.has(dbName)) {
    return connectionCache.get(dbName)!;
  }

  // Replace the database name in the URI
  const uri = baseUri.replace(/\/[^/?]+(\?|$)/, `/${dbName}$1`);

  const connection = mongoose.createConnection(uri);

  connection.on('connected', () => {
    console.log(`📊 Tenant DB connected: ${dbName}`);
  });

  connection.on('error', (err) => {
    console.error(`❌ Tenant DB error (${dbName}):`, err);
    connectionCache.delete(dbName);
  });

  connectionCache.set(dbName, connection);
  return connection;
}

export function closeTenantConnection(dbName: string): void {
  const connection = connectionCache.get(dbName);
  if (connection) {
    connection.close();
    connectionCache.delete(dbName);
  }
}
