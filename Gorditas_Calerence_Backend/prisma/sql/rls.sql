-- Row Level Security de Kustodela POS.
-- Se anexa al final de la migración inicial y debe re-ejecutarse (idempotente) cuando se agreguen
-- tablas con tenant_id en migraciones posteriores.
--
-- Contrato: la aplicación ejecuta, dentro de cada transacción,
--   SELECT set_config('app.tenant_id', '<uuid>', true);
-- El rol de runtime (pos_app) no tiene BYPASSRLS y FORCE aplica también al dueño (pos_migrator).

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'tenant_users', 'counters',
      'guisos', 'tipos_producto', 'productos', 'tipos_platillo', 'platillos',
      'tipos_extra', 'extras', 'tipos_orden', 'mesas', 'tipos_gasto', 'gastos',
      'ordenes', 'subordenes', 'orden_detalle_platillos', 'orden_detalle_productos', 'orden_detalle_extras'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())',
      t
    );
  END LOOP;
END
$$;

-- Permisos del rol de runtime (las tablas nuevas heredan por ALTER DEFAULT PRIVILEGES del init).
GRANT USAGE ON SCHEMA public TO pos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pos_app;
GRANT EXECUTE ON FUNCTION current_tenant_id() TO pos_app;
REVOKE DELETE ON stripe_events FROM pos_app;
REVOKE ALL ON _prisma_migrations FROM pos_app;
