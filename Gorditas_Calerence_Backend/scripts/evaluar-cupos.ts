/**
 * Revisa el cupo de todos los restaurantes: arranca el plazo a los que empezaron a exceder su
 * plan, lo cancela a los que volvieron a caber, y desactiva a los que sobran cuando el plazo
 * venció.
 *
 * Bajar de plan no expulsa a nadie en el momento: durante el plazo la pantalla de personal dice
 * la fecha y el nombre de quien se irá. Este trabajo es lo que hace que ese aviso signifique
 * algo — sin él, el aviso se puede ignorar para siempre.
 *
 *   NODE_ENV=production npx tsx scripts/evaluar-cupos.ts
 *
 * Pensado para correr una vez al día por cron. Es idempotente: correrlo de más no desactiva de
 * más, porque tras ajustar limpia la marca y el plazo vuelve a empezar de cero.
 */
import { buildContainer } from '../src/container';

async function main(): Promise<void> {
  const c = buildContainer();
  try {
    const resultados = await c.evaluarCupo.aplicarATodos();

    let iniciados = 0;
    let cancelados = 0;
    let ajustados = 0;
    let fallidos = 0;

    for (const { tenant, resultado } of resultados) {
      if (!resultado) {
        fallidos += 1;
        continue;
      }
      switch (resultado.accion) {
        case 'plazo-iniciado':
          iniciados += 1;
          console.log(`[cupo] ${tenant.slug}: excede su plan, plazo hasta ${resultado.fechaLimite.toISOString().slice(0, 10)}`);
          break;
        case 'plazo-cancelado':
          cancelados += 1;
          console.log(`[cupo] ${tenant.slug}: volvió a caber, plazo cancelado`);
          break;
        case 'ajustado':
          ajustados += 1;
          console.log(`[cupo] ${tenant.slug}: venció el plazo, desactivados ${resultado.desactivados.map((m) => m.email).join(', ') || '(ninguno)'}`);
          if (resultado.quedanDeMas > 0) {
            console.log(`[cupo] ${tenant.slug}: sigue ${resultado.quedanDeMas} por encima; solo queda el último administrador`);
          }
          break;
        default:
          break;
      }
    }

    console.log(
      `[cupo] ${resultados.length} restaurantes revisados: ${iniciados} con plazo nuevo, ${cancelados} cancelados, ${ajustados} ajustados, ${fallidos} con error`,
    );
    // Un restaurante que falló no debe pasar desapercibido: el cron lo reporta por el código.
    if (fallidos > 0) process.exitCode = 1;
  } finally {
    await c.shutdown();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
