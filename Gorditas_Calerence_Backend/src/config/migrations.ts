import path from 'path';

export async function runPendingMigrations(): Promise<void> {
  const migrateMongo = await (eval('import("migrate-mongo")') as Promise<any>);

  const configPath = path.resolve(__dirname, '../../migrate-mongo-config.js');
  const migrationConfig = require(configPath);

  migrateMongo.config.set(migrationConfig);

  const { db, client } = await migrateMongo.database.connect();

  try {
    const migrationStatus = await migrateMongo.status(db);
    const pending = migrationStatus.filter((m: any) => m.appliedAt === 'PENDING');

    if (pending.length === 0) {
      console.log('ℹ️  No pending migrations');
      return;
    }

    console.log(`🔄 Running ${pending.length} pending migration(s)...`);
    const applied = await migrateMongo.up(db, client);

    for (const migration of applied) {
      console.log(`  ✅ Applied: ${migration}`);
    }

    console.log('✅ All migrations applied successfully');
  } finally {
    await client.close();
  }
}
