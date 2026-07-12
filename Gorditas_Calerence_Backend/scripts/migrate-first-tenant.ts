/**
 * Script to register the existing database as the first tenant in the master DB.
 * Run with: npx ts-node scripts/migrate-first-tenant.ts
 */
import mongoose from 'mongoose';
import tenantSchema from '../src/models/Tenant';
import tenantUserSchema from '../src/models/TenantUser';

const MASTER_URI = process.env.MASTER_DB_URI || 'mongodb://localhost:27017/kustodela_master';

async function migrateFirstTenant() {
  console.log('🔄 Connecting to Master DB...');
  const masterConn = await mongoose.createConnection(MASTER_URI);

  const Tenant = masterConn.model('Tenant', tenantSchema);
  const TenantUser = masterConn.model('TenantUser', tenantUserSchema);

  // Check if already exists
  const existing = await Tenant.findOne({ slug: 'gorditas-calerence' });
  if (existing) {
    console.log('ℹ️  Tenant "gorditas-calerence" already exists. Skipping.');
    await masterConn.close();
    return;
  }

  // Create tenant record
  const tenant = new Tenant({
    slug: 'gorditas-calerence',
    nombre: 'Gorditas Calerence',
    dbName: 'mi_tienda_gorditas', // Existing database name
    plan: 'empresarial',
    activo: true,
    config: {
      paleta: 'orange',
    },
  });
  await tenant.save();
  console.log('✅ Tenant "gorditas-calerence" created');
  console.log(`   URL: pos-gorditas-calerence.kustodela.com`);
  console.log(`   DB: mi_tienda_gorditas`);

  // Note: TenantUser records will be created when existing users
  // login with Microsoft Entra for the first time (email matching)
  console.log('');
  console.log('📝 Note: Existing users will be linked when they first login with Microsoft.');
  console.log('   The system will match by email address.');

  await masterConn.close();
  console.log('✅ Migration complete');
}

migrateFirstTenant().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
