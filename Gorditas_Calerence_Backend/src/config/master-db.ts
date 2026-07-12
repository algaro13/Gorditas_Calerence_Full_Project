import mongoose from 'mongoose';
import tenantSchema, { ITenantDocument } from '../models/Tenant';
import tenantUserSchema, { ITenantUserDocument } from '../models/TenantUser';

let masterConnection: mongoose.Connection | null = null;

export async function connectMasterDB(uri: string): Promise<mongoose.Connection> {
  if (masterConnection) return masterConnection;

  masterConnection = mongoose.createConnection(uri);

  masterConnection.on('connected', () => {
    console.log('✅ Master DB connected');
  });

  masterConnection.on('error', (err) => {
    console.error('❌ Master DB error:', err);
  });

  return masterConnection;
}

export function getMasterDB(): mongoose.Connection {
  if (!masterConnection) {
    throw new Error('Master DB not connected. Call connectMasterDB first.');
  }
  return masterConnection;
}

export function getTenantModel() {
  const conn = getMasterDB();
  return conn.model<ITenantDocument>('Tenant', tenantSchema);
}

export function getTenantUserModel() {
  const conn = getMasterDB();
  return conn.model<ITenantUserDocument>('TenantUser', tenantUserSchema);
}
