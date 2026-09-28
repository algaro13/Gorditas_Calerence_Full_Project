-- Promociones, combos y la línea de descuento que producen.
--
-- Un descuento es una línea más de la orden, con importe negativo, y por eso el total sigue
-- siendo la suma de las líneas. Una columna `descuento` en la orden habría sido más simple y
-- habría perdido el porqué: no distinguiría un combo de una promoción ni permitiría reportar
-- por cuál se aplicó.
--
-- Escrita a mano a propósito, como 0002, 0003 y 0004: `prisma migrate dev` compara contra una
-- base sombra donde no existen los roles que crea 0001_init (pos_app, pos_migrator).

CREATE TYPE "FormaPromocion" AS ENUM ('combo', 'nxm', 'porcentaje');

CREATE TABLE "promociones" (
    "id" SERIAL NOT NULL,
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "nombre" TEXT NOT NULL,
    "forma" "FormaPromocion" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    -- Sin esto, solo se concede la que más favorece al cliente.
    "combinable" BOOLEAN NOT NULL DEFAULT false,

    -- Parámetros según la forma. Columnas con nombre y no un JSON: el conjunto de formas es
    -- cerrado, así que se puede escribir lo que cada una necesita.
    "precio" DECIMAL(12,2),
    "lleva" INTEGER,
    "paga" INTEGER,
    "porcentaje" DECIMAL(5,2),
    "id_tipo_platillo" INTEGER,

    -- Vigencia. Todo nulo o vacío significa siempre.
    "desde" DATE,
    "hasta" DATE,
    "dias_semana" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "hora_inicio" TEXT,
    "hora_fin" TEXT,

    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "promociones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "promocion_items" (
    "id" SERIAL NOT NULL,
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "id_promocion" INTEGER NOT NULL,
    "id_platillo" INTEGER,
    "id_producto" INTEGER,
    "cantidad" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "promocion_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orden_descuentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    "id_orden" UUID NOT NULL,
    "id_promocion" INTEGER NOT NULL,
    -- Copia del nombre en el momento de venderse, como las líneas copian `nombre_platillo`: lo
    -- que se vendió se cuenta como era el día que se vendió.
    "nombre" TEXT NOT NULL,
    -- Negativo. El total de la orden es la suma de sus líneas, y esta es una más.
    "importe" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orden_descuentos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "promociones_tenant_id_id_key" ON "promociones"("tenant_id", "id");
CREATE INDEX "promociones_tenant_id_activo_idx" ON "promociones"("tenant_id", "activo");
CREATE UNIQUE INDEX "promocion_items_tenant_id_id_key" ON "promocion_items"("tenant_id", "id");
CREATE INDEX "promocion_items_tenant_id_id_promocion_idx" ON "promocion_items"("tenant_id", "id_promocion");
CREATE UNIQUE INDEX "orden_descuentos_tenant_id_id_key" ON "orden_descuentos"("tenant_id", "id");
CREATE INDEX "orden_descuentos_tenant_id_id_orden_idx" ON "orden_descuentos"("tenant_id", "id_orden");
CREATE INDEX "orden_descuentos_tenant_id_id_promocion_idx" ON "orden_descuentos"("tenant_id", "id_promocion");

ALTER TABLE "promociones" ADD CONSTRAINT "promociones_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promociones" ADD CONSTRAINT "promociones_tipo_platillo_fkey"
  FOREIGN KEY ("tenant_id", "id_tipo_platillo") REFERENCES "tipos_platillo"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "promocion_items" ADD CONSTRAINT "promocion_items_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promocion_items" ADD CONSTRAINT "promocion_items_promocion_fkey"
  FOREIGN KEY ("tenant_id", "id_promocion") REFERENCES "promociones"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promocion_items" ADD CONSTRAINT "promocion_items_platillo_fkey"
  FOREIGN KEY ("tenant_id", "id_platillo") REFERENCES "platillos"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promocion_items" ADD CONSTRAINT "promocion_items_producto_fkey"
  FOREIGN KEY ("tenant_id", "id_producto") REFERENCES "productos"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orden_descuentos" ADD CONSTRAINT "orden_descuentos_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orden_descuentos" ADD CONSTRAINT "orden_descuentos_orden_fkey"
  FOREIGN KEY ("tenant_id", "id_orden") REFERENCES "ordenes"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
-- RESTRICT y no SET NULL: una promoción que ya se aplicó no se borra, se desactiva. Así ninguna
-- orden pasada pierde de dónde salió su descuento.
ALTER TABLE "orden_descuentos" ADD CONSTRAINT "orden_descuentos_promocion_fkey"
  FOREIGN KEY ("tenant_id", "id_promocion") REFERENCES "promociones"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- El mismo aislamiento que el resto: FORCE aplica también al dueño, y el rol de runtime no
-- tiene BYPASSRLS.
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['promociones', 'promocion_items', 'orden_descuentos'])
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
