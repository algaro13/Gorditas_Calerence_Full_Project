-- Retención de cuentas abandonadas (consola de plataforma, fase 2).
--
-- `archivado_at`: cuándo se archivó el restaurante por inactividad. Archivado = bloqueado, con
-- todos sus datos; su administrador lo recupera durante 30 días y después el operador puede
-- aprobar el borrado. Null si está en uso.
--
-- `retencion_pausada`: el operador excluyó a este restaurante del ciclo de avisos y archivado.
--
-- Escrita a mano, como 0002–0009: `prisma migrate dev` compara contra una base sombra donde no
-- existen los roles que crea 0001_init.

ALTER TABLE "tenants" ADD COLUMN "archivado_at" TIMESTAMPTZ(3);
ALTER TABLE "tenants" ADD COLUMN "retencion_pausada" BOOLEAN NOT NULL DEFAULT false;
