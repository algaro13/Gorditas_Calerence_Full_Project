-- Debe existir antes de crear las tablas: es el DEFAULT de tenant_id.
-- NULL cuando no hay contexto de tenant: el INSERT falla por NOT NULL y el SELECT no devuelve filas.
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT nullif(current_setting('app.tenant_id', true), '')::uuid
$$;
