const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/kustodela_master').then(async () => {
  const db = mongoose.connection.db;
  await db.collection('tenants').updateOne(
    { slug: 'gorditas-calerence' },
    { $set: { plan: 'basico', planStatus: 'active', maxUsuarios: 3 } }
  );
  const t = await db.collection('tenants').findOne({ slug: 'gorditas-calerence' });
  console.log('Plan:', t.plan, '| Status:', t.planStatus, '| MaxUsuarios:', t.maxUsuarios);
  process.exit(0);
});
