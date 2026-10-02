-- Fechas de la suscripción, para que el administrador sepa cuándo se renueva y cuándo termina
-- una que canceló desde el portal. Hasta ahora el webhook solo guardaba el estado.
--
-- Escrita a mano, como 0002–0006: `prisma migrate dev` compara contra una base sombra donde no
-- existen los roles que crea 0001_init.

ALTER TABLE "tenants" ADD COLUMN "current_period_end" TIMESTAMPTZ(3);
ALTER TABLE "tenants" ADD COLUMN "cancel_at" TIMESTAMPTZ(3);
