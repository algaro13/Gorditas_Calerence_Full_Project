import mongoose, { Document, Schema } from 'mongoose';

export interface ITenantUser {
  entraOid: string;
  tenantId: string;
  email: string;
  nombre: string;
  role: string;
  sucursalId?: string;
  activo: boolean;
  createdAt: Date;
}

export interface ITenantUserDocument extends ITenantUser, Document {}

const tenantUserSchema = new Schema<ITenantUserDocument>({
  entraOid: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true },
  email: { type: String, required: true, trim: true },
  nombre: { type: String, required: true, trim: true },
  role: { type: String, required: true, default: 'Admin' },
  sucursalId: { type: String },
  activo: { type: Boolean, default: true },
}, {
  timestamps: true,
  versionKey: false,
});

tenantUserSchema.index({ entraOid: 1 });
tenantUserSchema.index({ tenantId: 1 });
tenantUserSchema.index({ email: 1 });

export default tenantUserSchema;
