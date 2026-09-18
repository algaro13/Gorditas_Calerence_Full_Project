-- Cuándo desactivó el sistema a esta persona al vencer el plazo de cupo.
-- Null si la desactivó alguien a mano o si está activa. La pantalla lo usa para decir qué
-- ocurrió: sin esto, tras el vencimiento alguien simplemente deja de aparecer sin explicación.
--
-- Escrita a mano a propósito, por lo mismo que 0002: la base sombra de `prisma migrate dev`
-- no tiene los roles que crea 0001_init (pos_app, pos_migrator).
ALTER TABLE "tenant_users" ADD COLUMN "desactivado_por_cupo" TIMESTAMPTZ(3);
