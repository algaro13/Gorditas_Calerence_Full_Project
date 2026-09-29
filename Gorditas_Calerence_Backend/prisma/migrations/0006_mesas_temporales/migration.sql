-- Las mesas «Pedido N» de los pedidos para llevar se retiran solas al cerrarse.
--
-- Cada «Nuevo pedido» crea una mesa con ese nombre y nadie la desactivaba al cobrar, así que la
-- tabla crecía una fila por cada pedido para llevar —con nombres repetidos, porque el número se
-- reinicia cada día— y todas salían en Catálogos y en la rejilla de mesas.
--
-- Se marcan con una columna y no por el nombre: el nombre lo puede escribir cualquiera, y una
-- mesa de verdad que alguien llamara «Pedido 3» no debe desaparecer al cobrar su cuenta.
--
-- Escrita a mano, como 0002–0005: `prisma migrate dev` compara contra una base sombra donde no
-- existen los roles que crea 0001_init.

ALTER TABLE "mesas" ADD COLUMN "temporal" BOOLEAN NOT NULL DEFAULT false;

-- Las que ya existen. RLS es FORCE y aplica también al dueño, así que sin contexto de restaurante
-- el UPDATE no vería ninguna fila: se recorre cada uno con el mismo contrato que la aplicación.
-- Aquí sí se reconoce por el nombre, porque es lo único que había; se retiran solo las que no
-- tienen ninguna orden abierta.
DO $$
DECLARE
  t uuid;
BEGIN
  FOR t IN SELECT id FROM "tenants"
  LOOP
    PERFORM set_config('app.tenant_id', t::text, true);

    UPDATE "mesas" SET "temporal" = true
    WHERE "nombre" ~ '^Pedido [0-9]+$';

    UPDATE "mesas" m SET "activo" = false
    WHERE m."temporal" AND m."activo"
      AND NOT EXISTS (
        SELECT 1 FROM "ordenes" o
        WHERE o."id_mesa" = m."id" AND o."estatus" NOT IN ('Pagada', 'Cancelado')
      );
  END LOOP;
  PERFORM set_config('app.tenant_id', '', true);
END
$$;
