-- Qué versión del aviso de privacidad y de los términos aceptó el restaurante al registrarse,
-- cuándo y con qué correo. Nulos en los restaurantes registrados antes de existir los textos.
ALTER TABLE "tenants" ADD COLUMN "legal_version" TEXT;
ALTER TABLE "tenants" ADD COLUMN "legal_aceptado_at" TIMESTAMPTZ(3);
ALTER TABLE "tenants" ADD COLUMN "legal_aceptado_por" TEXT;
