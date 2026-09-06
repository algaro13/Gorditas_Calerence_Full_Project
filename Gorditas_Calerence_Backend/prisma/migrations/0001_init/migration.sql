-- Debe existir antes de crear las tablas: es el DEFAULT de tenant_id.
-- NULL cuando no hay contexto de tenant: el INSERT falla por NOT NULL y el SELECT no devuelve filas.
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT nullif(current_setting('app.tenant_id', true), '')::uuid
$$;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrdenEstatus" AS ENUM ('Pendiente', 'Recepcion', 'Preparacion', 'Surtida', 'Entregada', 'Pagada', 'Cancelado');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('trial', 'basico', 'profesional', 'empresarial');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('trial', 'active', 'past_due', 'canceled', 'expired');

-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('Admin', 'Encargado', 'Mesero', 'Despachador', 'Cocinero');

-- CreateEnum
CREATE TYPE "ProvisioningStatus" AS ENUM ('pending', 'ready', 'failed');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "zitadel_org_id" TEXT,
    "zitadel_project_grant_id" TEXT,
    "provisioning_status" "ProvisioningStatus" NOT NULL DEFAULT 'pending',
    "plan" "Plan" NOT NULL DEFAULT 'trial',
    "plan_status" "PlanStatus" NOT NULL DEFAULT 'trial',
    "trial_ends_at" TIMESTAMPTZ(3),
    "max_usuarios" INTEGER NOT NULL DEFAULT 3,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(3),
    "error" TEXT,

    CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "zitadel_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL DEFAULT 'Mesero',
    "grant_id" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tenant_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counters" (
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "key" TEXT NOT NULL,
    "value" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "counters_pkey" PRIMARY KEY ("tenant_id","key")
);

-- CreateTable
CREATE TABLE "guisos" (
    "id" SERIAL NOT NULL,
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "guisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_producto" (
    "id" SERIAL NOT NULL,
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tipos_producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" SERIAL NOT NULL,
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "id_tipo_producto" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "costo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "variantes" JSONB NOT NULL DEFAULT '[]',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_platillo" (
    "id" SERIAL NOT NULL,
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tipos_platillo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platillos" (
    "id" SERIAL NOT NULL,
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "id_tipo_platillo" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "costo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "precio" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "platillos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_extra" (
    "id" SERIAL NOT NULL,
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tipos_extra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extras" (
    "id" SERIAL NOT NULL,
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "id_tipo_extra" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "costo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "extras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_orden" (
    "id" SERIAL NOT NULL,
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tipos_orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mesas" (
    "id" SERIAL NOT NULL,
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_gasto" (
    "id" SERIAL NOT NULL,
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tipos_gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos" (
    "id" SERIAL NOT NULL,
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "id_tipo_gasto" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "gasto_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "descripcion" TEXT,
    "fecha" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "folio" TEXT NOT NULL,
    "id_tipo_orden" INTEGER NOT NULL,
    "nombre_tipo_orden" TEXT NOT NULL,
    "estatus" "OrdenEstatus" NOT NULL DEFAULT 'Recepcion',
    "id_mesa" INTEGER,
    "nombre_mesa" TEXT,
    "nombre_cliente" TEXT,
    "fecha_hora" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_pago" TIMESTAMPTZ(3),
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notas" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ordenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subordenes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "id_orden" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subordenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_detalle_platillos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "id_suborden" UUID NOT NULL,
    "id_platillo" INTEGER NOT NULL,
    "nombre_platillo" TEXT NOT NULL,
    "id_guiso" INTEGER NOT NULL,
    "nombre_guiso" TEXT NOT NULL,
    "costo_platillo" DECIMAL(12,2) NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "importe" DECIMAL(12,2) NOT NULL,
    "notas" TEXT,
    "listo" BOOLEAN NOT NULL DEFAULT false,
    "entregado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orden_detalle_platillos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_detalle_productos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "id_orden" UUID NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "nombre_producto" TEXT NOT NULL,
    "costo_producto" DECIMAL(12,2) NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "importe" DECIMAL(12,2) NOT NULL,
    "listo" BOOLEAN NOT NULL DEFAULT false,
    "entregado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orden_detalle_productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_detalle_extras" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "id_orden_detalle_platillo" UUID NOT NULL,
    "id_extra" INTEGER NOT NULL,
    "nombre_extra" TEXT NOT NULL,
    "costo_extra" DECIMAL(12,2) NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "importe" DECIMAL(12,2) NOT NULL,
    "listo" BOOLEAN NOT NULL DEFAULT false,
    "entregado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orden_detalle_extras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_zitadel_org_id_key" ON "tenants"("zitadel_org_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_stripe_customer_id_key" ON "tenants"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_stripe_subscription_id_key" ON "tenants"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "tenants_activo_idx" ON "tenants"("activo");

-- CreateIndex
CREATE INDEX "tenant_users_tenant_id_activo_idx" ON "tenant_users"("tenant_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_users_tenant_id_zitadel_user_id_key" ON "tenant_users"("tenant_id", "zitadel_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_users_tenant_id_email_key" ON "tenant_users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "guisos_tenant_id_nombre_idx" ON "guisos"("tenant_id", "nombre");

-- CreateIndex
CREATE INDEX "guisos_tenant_id_activo_idx" ON "guisos"("tenant_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "guisos_tenant_id_id_key" ON "guisos"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "tipos_producto_tenant_id_nombre_idx" ON "tipos_producto"("tenant_id", "nombre");

-- CreateIndex
CREATE INDEX "tipos_producto_tenant_id_activo_idx" ON "tipos_producto"("tenant_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_producto_tenant_id_id_key" ON "tipos_producto"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "productos_tenant_id_nombre_idx" ON "productos"("tenant_id", "nombre");

-- CreateIndex
CREATE INDEX "productos_tenant_id_id_tipo_producto_idx" ON "productos"("tenant_id", "id_tipo_producto");

-- CreateIndex
CREATE INDEX "productos_tenant_id_activo_idx" ON "productos"("tenant_id", "activo");

-- CreateIndex
CREATE INDEX "productos_tenant_id_cantidad_idx" ON "productos"("tenant_id", "cantidad");

-- CreateIndex
CREATE UNIQUE INDEX "productos_tenant_id_id_key" ON "productos"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "tipos_platillo_tenant_id_nombre_idx" ON "tipos_platillo"("tenant_id", "nombre");

-- CreateIndex
CREATE INDEX "tipos_platillo_tenant_id_activo_idx" ON "tipos_platillo"("tenant_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_platillo_tenant_id_id_key" ON "tipos_platillo"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "platillos_tenant_id_nombre_idx" ON "platillos"("tenant_id", "nombre");

-- CreateIndex
CREATE INDEX "platillos_tenant_id_id_tipo_platillo_idx" ON "platillos"("tenant_id", "id_tipo_platillo");

-- CreateIndex
CREATE INDEX "platillos_tenant_id_activo_idx" ON "platillos"("tenant_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "platillos_tenant_id_id_key" ON "platillos"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "tipos_extra_tenant_id_nombre_idx" ON "tipos_extra"("tenant_id", "nombre");

-- CreateIndex
CREATE INDEX "tipos_extra_tenant_id_activo_idx" ON "tipos_extra"("tenant_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_extra_tenant_id_id_key" ON "tipos_extra"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "extras_tenant_id_nombre_idx" ON "extras"("tenant_id", "nombre");

-- CreateIndex
CREATE INDEX "extras_tenant_id_id_tipo_extra_idx" ON "extras"("tenant_id", "id_tipo_extra");

-- CreateIndex
CREATE INDEX "extras_tenant_id_activo_idx" ON "extras"("tenant_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "extras_tenant_id_id_key" ON "extras"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "tipos_orden_tenant_id_nombre_idx" ON "tipos_orden"("tenant_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_orden_tenant_id_id_key" ON "tipos_orden"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "mesas_tenant_id_nombre_idx" ON "mesas"("tenant_id", "nombre");

-- CreateIndex
CREATE INDEX "mesas_tenant_id_activo_idx" ON "mesas"("tenant_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "mesas_tenant_id_id_key" ON "mesas"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "tipos_gasto_tenant_id_nombre_idx" ON "tipos_gasto"("tenant_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_gasto_tenant_id_id_key" ON "tipos_gasto"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "gastos_tenant_id_fecha_idx" ON "gastos"("tenant_id", "fecha" DESC);

-- CreateIndex
CREATE INDEX "gastos_tenant_id_id_tipo_gasto_idx" ON "gastos"("tenant_id", "id_tipo_gasto");

-- CreateIndex
CREATE UNIQUE INDEX "gastos_tenant_id_id_key" ON "gastos"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "ordenes_tenant_id_estatus_idx" ON "ordenes"("tenant_id", "estatus");

-- CreateIndex
CREATE INDEX "ordenes_tenant_id_fecha_hora_idx" ON "ordenes"("tenant_id", "fecha_hora" DESC);

-- CreateIndex
CREATE INDEX "ordenes_tenant_id_id_mesa_idx" ON "ordenes"("tenant_id", "id_mesa");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_tenant_id_folio_key" ON "ordenes"("tenant_id", "folio");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_tenant_id_id_key" ON "ordenes"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "subordenes_tenant_id_id_orden_idx" ON "subordenes"("tenant_id", "id_orden");

-- CreateIndex
CREATE UNIQUE INDEX "subordenes_tenant_id_id_key" ON "subordenes"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "orden_detalle_platillos_tenant_id_id_suborden_idx" ON "orden_detalle_platillos"("tenant_id", "id_suborden");

-- CreateIndex
CREATE INDEX "orden_detalle_platillos_tenant_id_id_platillo_idx" ON "orden_detalle_platillos"("tenant_id", "id_platillo");

-- CreateIndex
CREATE UNIQUE INDEX "orden_detalle_platillos_tenant_id_id_key" ON "orden_detalle_platillos"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "orden_detalle_productos_tenant_id_id_orden_idx" ON "orden_detalle_productos"("tenant_id", "id_orden");

-- CreateIndex
CREATE INDEX "orden_detalle_productos_tenant_id_id_producto_idx" ON "orden_detalle_productos"("tenant_id", "id_producto");

-- CreateIndex
CREATE UNIQUE INDEX "orden_detalle_productos_tenant_id_id_key" ON "orden_detalle_productos"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "orden_detalle_extras_tenant_id_id_orden_detalle_platillo_idx" ON "orden_detalle_extras"("tenant_id", "id_orden_detalle_platillo");

-- CreateIndex
CREATE INDEX "orden_detalle_extras_tenant_id_id_extra_idx" ON "orden_detalle_extras"("tenant_id", "id_extra");

-- CreateIndex
CREATE UNIQUE INDEX "orden_detalle_extras_tenant_id_id_key" ON "orden_detalle_extras"("tenant_id", "id");

-- AddForeignKey
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counters" ADD CONSTRAINT "counters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guisos" ADD CONSTRAINT "guisos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_producto" ADD CONSTRAINT "tipos_producto_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_tenant_id_id_tipo_producto_fkey" FOREIGN KEY ("tenant_id", "id_tipo_producto") REFERENCES "tipos_producto"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_platillo" ADD CONSTRAINT "tipos_platillo_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platillos" ADD CONSTRAINT "platillos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platillos" ADD CONSTRAINT "platillos_tenant_id_id_tipo_platillo_fkey" FOREIGN KEY ("tenant_id", "id_tipo_platillo") REFERENCES "tipos_platillo"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_extra" ADD CONSTRAINT "tipos_extra_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extras" ADD CONSTRAINT "extras_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extras" ADD CONSTRAINT "extras_tenant_id_id_tipo_extra_fkey" FOREIGN KEY ("tenant_id", "id_tipo_extra") REFERENCES "tipos_extra"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_orden" ADD CONSTRAINT "tipos_orden_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_gasto" ADD CONSTRAINT "tipos_gasto_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_tenant_id_id_tipo_gasto_fkey" FOREIGN KEY ("tenant_id", "id_tipo_gasto") REFERENCES "tipos_gasto"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_tenant_id_id_tipo_orden_fkey" FOREIGN KEY ("tenant_id", "id_tipo_orden") REFERENCES "tipos_orden"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_tenant_id_id_mesa_fkey" FOREIGN KEY ("tenant_id", "id_mesa") REFERENCES "mesas"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subordenes" ADD CONSTRAINT "subordenes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subordenes" ADD CONSTRAINT "subordenes_tenant_id_id_orden_fkey" FOREIGN KEY ("tenant_id", "id_orden") REFERENCES "ordenes"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_detalle_platillos" ADD CONSTRAINT "orden_detalle_platillos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_detalle_platillos" ADD CONSTRAINT "orden_detalle_platillos_tenant_id_id_suborden_fkey" FOREIGN KEY ("tenant_id", "id_suborden") REFERENCES "subordenes"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_detalle_platillos" ADD CONSTRAINT "orden_detalle_platillos_tenant_id_id_platillo_fkey" FOREIGN KEY ("tenant_id", "id_platillo") REFERENCES "platillos"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_detalle_platillos" ADD CONSTRAINT "orden_detalle_platillos_tenant_id_id_guiso_fkey" FOREIGN KEY ("tenant_id", "id_guiso") REFERENCES "guisos"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_detalle_productos" ADD CONSTRAINT "orden_detalle_productos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_detalle_productos" ADD CONSTRAINT "orden_detalle_productos_tenant_id_id_orden_fkey" FOREIGN KEY ("tenant_id", "id_orden") REFERENCES "ordenes"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_detalle_productos" ADD CONSTRAINT "orden_detalle_productos_tenant_id_id_producto_fkey" FOREIGN KEY ("tenant_id", "id_producto") REFERENCES "productos"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_detalle_extras" ADD CONSTRAINT "orden_detalle_extras_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_detalle_extras" ADD CONSTRAINT "orden_detalle_extras_tenant_id_id_orden_detalle_platillo_fkey" FOREIGN KEY ("tenant_id", "id_orden_detalle_platillo") REFERENCES "orden_detalle_platillos"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_detalle_extras" ADD CONSTRAINT "orden_detalle_extras_tenant_id_id_extra_fkey" FOREIGN KEY ("tenant_id", "id_extra") REFERENCES "extras"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


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
