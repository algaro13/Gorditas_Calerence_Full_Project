/**
 * Borra de la base LOCAL lo que dejaron las pruebas de navegador.
 *
 * Las pruebas de Playwright corren contra el restaurante «demo» de desarrollo y no pueden deshacer
 * todo lo que crean: una orden cobrada no se borra desde la pantalla y una promoción solo se
 * desactiva. Tras unas semanas había más de cien órdenes «E2E …», cincuenta promociones y cien
 * mesas «Pedido N», y las pantallas se veían mucho más cargadas que las de un restaurante real.
 *
 * Solo toca lo que lleva la marca de una prueba —nunca por fecha ni por parecido—:
 *   - órdenes cuyo cliente es «E2E <marca de tiempo>»;
 *   - promociones cuyo nombre termina en una marca de tiempo, o las de las capturas de revisión
 *     («Combo comida», «DBG combo»), si ninguna orden que quede las usa;
 *   - mesas temporales de pedidos que se quedan sin órdenes;
 *   - montos de caja de 1999, el año que usa la prueba de la caja importada.
 *
 * Sin `--aplicar` solo cuenta. Se niega a correr contra una base que no sea local.
 *
 * Uso:
 *   npm run e2e:limpiar                      # cuenta lo que borraría
 *   npm run e2e:limpiar -- --aplicar         # lo borra
 *   npm run e2e:limpiar -- --aplicar --dias 7  # solo lo de hace más de 7 días
 */
import { PrismaClient } from '@prisma/client';
import { runAsTenant } from '../src/shared/infrastructure/prisma/unit-of-work';

const args = process.argv.slice(2);
const valor = (nombre: string, def: string) => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const aplicar = args.includes('--aplicar');
const silencioso = args.includes('--silencioso');
const slug = valor('slug', 'demo');
const dias = Number(valor('dias', '0'));

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '';
const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
})();

const decir = (m: string) => {
  if (!silencioso) console.log(`[limpiar-e2e] ${m}`);
};

const CLIENTE_DE_PRUEBA = /^E2E \d{10,}$/;
const PROMO_DE_PRUEBA = /\d{10,}$/;
const PROMOS_DE_CAPTURAS = new Set(['Combo comida', 'DBG combo']);

async function main(): Promise<void> {
  // La salvaguarda que importa: esto borra órdenes. Nunca contra el VPS ni contra nada remoto.
  if (!['localhost', '127.0.0.1', '::1'].includes(host) || process.env.NODE_ENV === 'production') {
    throw new Error(`Se niega a limpiar una base que no es local (host «${host || 'desconocido'}»).`);
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const tenant = await prisma.tenant.findFirst({ where: { slug } });
    if (!tenant) {
      decir(`No existe el restaurante «${slug}». Nada que limpiar.`);
      return;
    }
    const antesDe = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

    await runAsTenant(prisma, tenant.id, async (db) => {
      const ordenes = (await db.orden.findMany({
        where: { createdAt: { lt: antesDe } },
        select: { id: true, nombreCliente: true, idMesa: true },
      })).filter((o) => CLIENTE_DE_PRUEBA.test(o.nombreCliente ?? ''));

      const promociones = (await db.promocion.findMany({
        where: { activo: false, createdAt: { lt: antesDe } },
        select: { id: true, nombre: true },
      })).filter((p) => PROMO_DE_PRUEBA.test(p.nombre) || PROMOS_DE_CAPTURAS.has(p.nombre));

      const cajas = await db.cajaDiaria.findMany({
        where: { fecha: { gte: new Date('1999-01-01'), lt: new Date('2000-01-01') } },
        select: { id: true },
      });

      decir(`${aplicar ? 'Borrando' : 'Se borrarían'} en «${slug}»${dias ? ` (más de ${dias} días)` : ''}: ` +
        `${ordenes.length} órdenes, hasta ${promociones.length} promociones, ${cajas.length} montos de caja de 1999, ` +
        'y las mesas temporales que se queden sin órdenes.');
      if (!aplicar) {
        decir('Nada borrado. Repite con --aplicar para borrarlo.');
        return;
      }

      // Primero las órdenes: sus líneas y descuentos se van en cascada, y liberan las promociones
      // y las mesas que usaban.
      await db.orden.deleteMany({ where: { id: { in: ordenes.map((o) => o.id) } } });

      // Una promoción que aún explica el descuento de una orden que se queda no se borra: la
      // llave lo impide a propósito (RESTRICT), y esa orden perdería de dónde salió su descuento.
      let promosBorradas = 0;
      for (const p of promociones) {
        const usada = await db.ordenDescuento.count({ where: { idPromocion: p.id } });
        if (usada) continue;
        await db.promocionItem.deleteMany({ where: { idPromocion: p.id } });
        await db.promocion.delete({ where: { id: p.id } });
        promosBorradas++;
      }

      const mesas = await db.mesa.deleteMany({ where: { temporal: true, ordenes: { none: {} } } });
      await db.cajaDiaria.deleteMany({ where: { id: { in: cajas.map((c) => c.id) } } });

      decir(`Borradas: ${ordenes.length} órdenes, ${promosBorradas} promociones, ${mesas.count} mesas temporales, ${cajas.length} montos de caja.`);
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(`[limpiar-e2e] ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
