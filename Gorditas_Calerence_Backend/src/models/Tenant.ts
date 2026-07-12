import mongoose, { Document, Schema } from 'mongoose';

export interface ITenant {
  slug: string;
  nombre: string;
  dbName: string;
  plan: string;
  activo: boolean;
  config: {
    logo?: string;
    paleta?: string;
    imagen?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ITenantDocument extends ITenant, Document {}

const tenantSchema = new Schema<ITenantDocument>({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  nombre: { type: String, required: true, trim: true },
  dbName: { type: String, required: true, unique: true },
  plan: { type: String, default: 'trial' },
  activo: { type: Boolean, default: true },
  config: {
    logo: { type: String },
    paleta: { type: String, default: 'orange' },
    imagen: { type: String },
  },
}, {
  timestamps: true,
  versionKey: false,
});

tenantSchema.index({ slug: 1 });
tenantSchema.index({ activo: 1 });

export default tenantSchema;
