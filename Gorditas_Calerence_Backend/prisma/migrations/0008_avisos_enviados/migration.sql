-- Registro de los avisos por correo que manda el backend (por ahora, el fin de la prueba).
--
-- Sirve para no mandar dos veces el mismo aviso: el trabajo diario lo consulta antes de enviar.
-- `referencia` es la fecha a la que se refiere el aviso —el fin de la prueba—, así que si un día
-- se extiende una prueba, la fecha nueva merece su propio aviso.
--
-- Tabla de plataforma, como `tenants` y `stripe_events`: sin RLS. La escribe un trabajo que
-- recorre todos los restaurantes, no una petición de uno.
--
-- Escrita a mano, como 0002–0007: `prisma migrate dev` compara contra una base sombra donde no
-- existen los roles que crea 0001_init.

CREATE TABLE "avisos_enviados" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "referencia" TIMESTAMPTZ(3) NOT NULL,
    "destinatarios" TEXT NOT NULL,
    "enviado_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avisos_enviados_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "avisos_enviados_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "avisos_enviados_tenant_id_tipo_referencia_key" ON "avisos_enviados"("tenant_id", "tipo", "referencia");

-- Es un registro: lo enviado no se reescribe.
REVOKE UPDATE ON "avisos_enviados" FROM pos_app;
