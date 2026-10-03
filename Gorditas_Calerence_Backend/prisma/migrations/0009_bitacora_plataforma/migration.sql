-- Bitácora de la consola de plataforma: quién la consultó, qué y cuándo.
--
-- La consola ve a todos los restaurantes. Un acceso así se registra siempre, para poder responder
-- después quién miró qué. Tabla de plataforma (sin RLS), como `tenants` y `avisos_enviados`.
--
-- Escrita a mano, como 0002–0008: `prisma migrate dev` compara contra una base sombra donde no
-- existen los roles que crea 0001_init.

CREATE TABLE "bitacora_plataforma" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operador_id" TEXT NOT NULL,
    "operador_email" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "detalle" JSONB NOT NULL DEFAULT '{}',
    "creado_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bitacora_plataforma_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bitacora_plataforma_creado_at_idx" ON "bitacora_plataforma"("creado_at" DESC);

-- Una bitácora no se reescribe ni se borra desde la aplicación.
REVOKE UPDATE, DELETE ON "bitacora_plataforma" FROM pos_app;
