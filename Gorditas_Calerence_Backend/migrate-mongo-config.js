const path = require('path');
const fs = require('fs');

// Load appsettings.json
const settingsPath = path.resolve(__dirname, 'appsettings.json');
let fileConfig = {};
if (fs.existsSync(settingsPath)) {
  fileConfig = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
}

// Environment variable overrides file config
const uri = process.env.MONGODB_URI || (fileConfig.database && fileConfig.database.uri) || '';

// Parse database name from URI
function getDatabaseName(connectionUri) {
  try {
    const url = new URL(connectionUri);
    const dbName = url.pathname.replace('/', '');
    return dbName || 'calerence_db';
  } catch {
    return 'calerence_db';
  }
}

const config = {
  mongodb: {
    url: uri,
    databaseName: getDatabaseName(uri),
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.js',
  useFileHash: false,
  moduleSystem: 'commonjs',
};

module.exports = config;
