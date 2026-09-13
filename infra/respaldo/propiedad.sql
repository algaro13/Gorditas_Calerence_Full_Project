-- Devuelve los objetos restaurados a su dueño legítimo.
--
-- No se usa `REASSIGN OWNED BY postgres`: ese comando alcanza también objetos del sistema y
-- PostgreSQL lo rechaza con «cannot reassign ownership of objects owned by role postgres
-- because they are required by the database system». Aquí se recorren solo los objetos de
-- los esquemas de usuario.
--
-- Por qué importa aunque el sistema parezca funcionar sin esto: el volcado se restaura como
-- postgres, que hace falta para cargar datos en tablas con RLS forzada, así que todo queda a
-- su nombre. Los permisos de pos_app viajan dentro del volcado, de modo que el POS arranca y
-- el fallo no se ve. Pero tanto Prisma como Zitadel aplican migraciones al iniciar, cada uno
-- con su propio rol, y sobre objetos ajenos no pueden: la primera actualización posterior a
-- una recuperación fallaría, semanas después y sin relación aparente con el desastre.
--
-- Se ejecuta sobre cada base; el dueño correcto se deduce del nombre de la base.

DO $$
DECLARE
  duenio text := CASE current_database() WHEN 'kustodela' THEN 'pos_migrator' ELSE 'zitadel' END;
  r record;
BEGIN
  FOR r IN SELECT n.nspname AS nombre
             FROM pg_namespace n
            WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'
  LOOP
    EXECUTE format('ALTER SCHEMA %I OWNER TO %I', r.nombre, duenio);
  END LOOP;

  FOR r IN SELECT n.nspname AS esquema, c.relname AS nombre, c.relkind AS tipo
             FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'
              AND c.relkind IN ('r', 'p', 'S', 'v', 'm')
              -- Una secuencia ligada a una columna (serial / identity) no admite cambio de
              -- dueño propio: sigue al de su tabla. Intentarlo aborta con «is linked to table».
              AND NOT (c.relkind = 'S' AND EXISTS (
                SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'a'))
              -- Lo que pertenece a una extensión es suyo; alterarlo aborta.
              AND NOT EXISTS (
                SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('ALTER %s %I.%I OWNER TO %I',
      CASE r.tipo WHEN 'S' THEN 'SEQUENCE'
                  WHEN 'v' THEN 'VIEW'
                  WHEN 'm' THEN 'MATERIALIZED VIEW'
                  ELSE 'TABLE' END,
      r.esquema, r.nombre, duenio);
  END LOOP;

  FOR r IN SELECT n.nspname AS esquema, t.typname AS nombre
             FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'
              AND t.typtype = 'e'
              AND NOT EXISTS (
                SELECT 1 FROM pg_depend d WHERE d.objid = t.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('ALTER TYPE %I.%I OWNER TO %I', r.esquema, r.nombre, duenio);
  END LOOP;

  FOR r IN SELECT p.oid::regprocedure AS firma
             FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'
              AND NOT EXISTS (
                SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('ALTER FUNCTION %s OWNER TO %I', r.firma, duenio);
  END LOOP;
END $$;

-- Permisos de ejecución del rol de la aplicación. Vienen en el volcado, pero se reafirman
-- aquí para que la restauración no dependa de que el volcado los trajera.
DO $$
BEGIN
  IF current_database() = 'kustodela' THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO pos_app';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pos_app';
    EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pos_app';
    EXECUTE 'REVOKE DELETE ON stripe_events FROM pos_app';
  END IF;
END $$;
