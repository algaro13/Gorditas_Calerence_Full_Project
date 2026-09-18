-- Desde cuándo el restaurante tiene más usuarios activos de los que su plan permite.
-- Null significa que cabe. Arranca el plazo tras el cual el sistema desactiva a los que sobran.
--
-- Escrita a mano a propósito: `prisma migrate dev` compara contra una base sombra donde no
-- existen los roles que crea 0001_init (pos_app, pos_migrator), así que no puede aplicarla.
ALTER TABLE "tenants" ADD COLUMN "sobre_cupo_desde" TIMESTAMPTZ(3);
