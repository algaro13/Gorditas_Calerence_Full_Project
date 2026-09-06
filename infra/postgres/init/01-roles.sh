#!/bin/bash
# Se ejecuta una sola vez al crear el volumen de datos de PostgreSQL.
# Crea las bases y roles de Kustodela y de Zitadel. Compartido entre local y producción.
set -euo pipefail

: "${POS_APP_PASSWORD:?POS_APP_PASSWORD requerido}"
: "${POS_MIGRATOR_PASSWORD:?POS_MIGRATOR_PASSWORD requerido}"
: "${ZITADEL_DB_PASSWORD:?ZITADEL_DB_PASSWORD requerido}"
CREATEDB_FLAG="NOCREATEDB"
if [ "${POS_MIGRATOR_CREATEDB:-false}" = "true" ]; then
  # Solo en desarrollo: prisma migrate dev necesita crear la shadow database.
  CREATEDB_FLAG="CREATEDB"
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<EOSQL
  -- Zitadel: dueño de su propia base
  CREATE ROLE zitadel LOGIN PASSWORD '${ZITADEL_DB_PASSWORD}';
  CREATE DATABASE zitadel OWNER zitadel;

  -- Kustodela: migrador (dueño del esquema) y rol de runtime sin BYPASSRLS
  CREATE ROLE pos_migrator LOGIN PASSWORD '${POS_MIGRATOR_PASSWORD}' ${CREATEDB_FLAG} NOBYPASSRLS;
  CREATE ROLE pos_app LOGIN PASSWORD '${POS_APP_PASSWORD}' NOBYPASSRLS NOCREATEDB NOCREATEROLE NOSUPERUSER;
  CREATE DATABASE kustodela OWNER pos_migrator;
EOSQL

if [ "${POS_MIGRATOR_CREATEDB:-false}" = "true" ]; then
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<EOSQL
    CREATE DATABASE kustodela_test OWNER pos_migrator;
EOSQL
  DBS="kustodela kustodela_test"
else
  DBS="kustodela"
fi

for db in $DBS; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db" <<EOSQL
    -- En PG15+ el esquema public pertenece al dueño de la base (pos_migrator).
    GRANT USAGE ON SCHEMA public TO pos_app;
    ALTER DEFAULT PRIVILEGES FOR ROLE pos_migrator IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pos_app;
    ALTER DEFAULT PRIVILEGES FOR ROLE pos_migrator IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO pos_app;
    ALTER DEFAULT PRIVILEGES FOR ROLE pos_migrator IN SCHEMA public
      GRANT EXECUTE ON FUNCTIONS TO pos_app;
EOSQL
done

echo "Roles y bases de Kustodela creados (createdb para pos_migrator: ${POS_MIGRATOR_CREATEDB:-false})"
