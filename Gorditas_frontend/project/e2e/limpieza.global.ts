import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * Antes de cada corrida, lo que dejaron las corridas de hace más de una semana.
 *
 * Las pruebas crean órdenes, promociones y mesas de pedido que no pueden deshacer desde la
 * pantalla, y se acumulaban: cien órdenes «E2E» y cincuenta promociones hacían que las pantallas
 * se vieran mucho más cargadas que las de un restaurante real. No se borra todo: las pruebas de
 * Reportes miran la última semana y necesitan ventas en ella.
 *
 * Si falla —el backend sin instalar, la base apagada— avisa y sigue: una limpieza que no se pudo
 * hacer no es motivo para no probar. El script se niega a tocar una base que no sea local.
 */
export default function limpiar(): void {
  const backend = fileURLToPath(new URL('../../../Gorditas_Calerence_Backend', import.meta.url));
  try {
    execSync('npm run -s e2e:limpiar -- --aplicar --dias 7', { cwd: backend, stdio: 'inherit' });
  } catch {
    console.warn('[e2e] No se pudo limpiar lo que dejaron corridas anteriores; se sigue igual.');
  }
}
