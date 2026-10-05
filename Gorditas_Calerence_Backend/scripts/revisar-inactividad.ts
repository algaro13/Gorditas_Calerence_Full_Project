/**
 * Corre a mano el ciclo de inactividad: avisos y archivado de lo que toque hoy. Nunca borra.
 *
 *   NODE_ENV=production npx tsx scripts/revisar-inactividad.ts
 *
 * El backend ya se programa este trabajo (`src/trabajos.ts`); el script solo fuerza una corrida
 * ahora. Es idempotente: cada paso se registra en `avisos_enviados` y no se repite.
 */
import { buildContainer } from '../src/container';
import { revisarInactividad } from '../src/trabajos';

async function main(): Promise<void> {
  const c = buildContainer();
  try {
    const r = await revisarInactividad(c);
    console.log(
      `[retencion] ${r.revisados} restaurantes revisados: ${r.avisos} avisos, ${r.archivados} archivados, ${r.sinDestinatario} sin destinatario, ${r.fallidos} con error`,
    );
  } finally {
    await c.shutdown();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
