/**
 * Manda a mano los correos de fin de prueba que toquen hoy.
 *
 *   NODE_ENV=production npx tsx scripts/avisar-pruebas.ts
 *
 * **No hace falta ponerlo en un cron.** El backend se programa este trabajo solo (`src/trabajos.ts`):
 * corre un minuto después de arrancar y cada 24 horas. Este script sirve para forzar una corrida
 * ahora mismo; llama a la misma función que el programador.
 *
 * Es idempotente: cada aviso se registra en `avisos_enviados` y no se repite.
 *
 * Ojo: en la imagen de producción no viaja `scripts/` ni está `tsx`. Allí la forma de forzar una
 * corrida es `docker compose restart backend`.
 */
import { buildContainer } from '../src/container';
import { avisarPruebas } from '../src/trabajos';

async function main(): Promise<void> {
  const c = buildContainer();
  try {
    const r = await avisarPruebas(c);
    console.log(
      `[avisos] ${r.revisados} restaurantes revisados: ${r.enviados} avisos enviados, ${r.sinDestinatario} sin destinatario, ${r.fallidos} con error`,
    );
  } finally {
    await c.shutdown();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
