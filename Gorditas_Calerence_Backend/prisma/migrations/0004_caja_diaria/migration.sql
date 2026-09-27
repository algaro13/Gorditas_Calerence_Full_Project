-- El dinero en caja de un día deja el navegador y pasa a la base.
--
-- Estaba en `localStorage` bajo una sola llave: no se compartía entre dispositivos, no entraba
-- en el respaldo, se borraba al limpiar el navegador, y dos restaurantes abiertos en el mismo
-- navegador compartían el mismo dato. Esto último era una fuga entre inquilinos en un sistema
-- que aísla por RLS todo lo demás.
--
-- Escrita a mano a propósito, como 0002 y 0003: `prisma migrate dev` compara contra una base
-- sombra donde no existen los roles que crea 0001_init (pos_app, pos_migrator).

CREATE TABLE "caja_diaria" (
    "id" SERIAL NOT NULL,
    "tenant_id" UUID NOT NULL DEFAULT current_tenant_id(),
    -- Fecha sin hora: el día del negocio, ya resuelto por quien lo escribe.
    "fecha" DATE NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "caja_diaria_pkey" PRIMARY KEY ("id")
);

-- Un solo monto por restaurante y día. Es también el índice por el que se consulta un período.
CREATE UNIQUE INDEX "caja_diaria_tenant_id_fecha_key" ON "caja_diaria"("tenant_id", "fecha");

ALTER TABLE "caja_diaria" ADD CONSTRAINT "caja_diaria_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- El mismo aislamiento que el resto: FORCE aplica también al dueño, y el rol de runtime no
-- tiene BYPASSRLS.
ALTER TABLE "caja_diaria" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "caja_diaria" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "caja_diaria";
CREATE POLICY tenant_isolation ON "caja_diaria"
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
