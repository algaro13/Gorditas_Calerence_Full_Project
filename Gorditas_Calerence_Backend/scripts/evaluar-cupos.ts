/**
 * Dispara a mano la evaluación de cupos de todos los restaurantes.
 *
 *   NODE_ENV=production npx tsx scripts/evaluar-cupos.ts
 *
 * **No hace falta ponerlo en un cron.** El backend se programa este trabajo solo (`src/trabajos.ts`):
 * corre al arrancar y cada 24 horas. Así levantar el stack basta, también en un servidor
 * reconstruido desde un respaldo, sin nada que reinstalar.
 *
 * Este script sirve para forzar la evaluación ahora mismo sin esperar al ciclo, o correrla
 * contra una base concreta. Llama a la misma función que el programador, así que hace
 * exactamente lo mismo.
 *
 * Ojo: en la imagen de producción no viaja `scripts/` ni está `tsx` (el Dockerfile copia solo
 * `src` y la imagen final se instala con `--omit=dev`). Allí la forma de forzar una corrida es
 * `docker compose restart backend`, que la dispara un minuto después de arrancar.
 *
 * Es idempotente: correrlo de más no desactiva de más, porque tras ajustar limpia la marca y
 * el plazo vuelve a empezar de cero.
 */
import { buildContainer } from '../src/container';
import { evaluarCupos } from '../src/trabajos';

async function main(): Promise<void> {
  const c = buildContainer();
  try {
    const r = await evaluarCupos(c);
    console.log(
      `[cupo] ${r.revisados} restaurantes revisados: ${r.iniciados} con plazo nuevo, ${r.cancelados} cancelados, ${r.ajustados} ajustados, ${r.fallidos} con error`,
    );
    // Un restaurante que falló no debe pasar desapercibido: se reporta por el código de salida.
    if (r.fallidos > 0) process.exitCode = 1;
  } finally {
    await c.shutdown();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
