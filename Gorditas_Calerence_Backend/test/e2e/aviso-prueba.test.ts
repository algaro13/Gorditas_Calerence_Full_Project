import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../helpers/app';
import { createTestTenant, deleteTestTenant, type TestTenant } from '../helpers/db';
import { runAsTenant } from '../../src/shared/infrastructure/prisma/unit-of-work';
import { FakeEnviador } from '../../src/infrastructure/correo/FakeEnviador';

const DIA = 86_400_000;
const RUN = Date.now().toString(36);
const correo = (quien: string) => `${quien}-${RUN}@aviso.test`;

/**
 * El correo de fin de prueba contra la base de verdad.
 *
 * El trabajo recorre todos los restaurantes, también los que dejan otras pruebas, así que cada
 * afirmación mira solo los correos dirigidos a las direcciones de este archivo.
 */
describe('Aviso de fin de prueba', () => {
  let t: TestApp;
  const fake = new FakeEnviador();
  const creados: TestTenant[] = [];

  const enviadosA = (quien: string) => fake.enviados.filter((c) => c.para.includes(correo(quien)));

  async function restaurante(opts: { trialEndsAt: Date; planStatus?: 'trial' | 'active' }, miembros: { quien: string; role: 'Admin' | 'Mesero'; activo?: boolean; email?: string }[]) {
    const tenant = await createTestTenant(t.container.prisma, { trialEndsAt: opts.trialEndsAt, planStatus: opts.planStatus ?? 'trial' });
    creados.push(tenant);
    await runAsTenant(t.container.prisma, tenant.id, async (db) => {
      for (const m of miembros) {
        await db.tenantUser.create({
          data: { zitadelUserId: `${m.quien}-${RUN}`, email: m.email ?? correo(m.quien), nombre: m.quien, role: m.role, activo: m.activo ?? true },
        });
      }
    });
    return tenant;
  }

  beforeAll(async () => {
    t = await createTestApp({ enviadorDeCorreo: fake });
    const ahora = Date.now();
    await restaurante({ trialEndsAt: new Date(ahora + 2 * DIA) }, [
      { quien: 'por-vencer', role: 'Admin' },
      { quien: 'admin-inactivo', role: 'Admin', activo: false },
      { quien: 'mesero', role: 'Mesero' },
    ]);
    await restaurante({ trialEndsAt: new Date(ahora - DIA) }, [{ quien: 'vencida', role: 'Admin' }]);
    await restaurante({ trialEndsAt: new Date(ahora - 30 * DIA) }, [{ quien: 'vencida-hace-mucho', role: 'Admin' }]);
    await restaurante({ trialEndsAt: new Date(ahora + 2 * DIA), planStatus: 'active' }, [{ quien: 'ya-paga', role: 'Admin' }]);
    // Solo un administrador con el correo de relleno del espejo: no hay a quién escribir.
    await restaurante({ trialEndsAt: new Date(ahora + DIA) }, [{ quien: 'sin-correo', role: 'Admin', email: `sin-correo-${RUN}@sin-correo.local` }]);
  });

  afterAll(async () => {
    for (const c of creados) await deleteTestTenant(t.container.prisma, c.id);
    await t.container.shutdown();
  });

  it('a cada quien lo suyo, una sola vez', async () => {
    await t.container.avisarFinDePrueba.ejecutar();

    const porVencer = enviadosA('por-vencer');
    expect(porVencer).toHaveLength(1);
    expect(porVencer[0].asunto).toMatch(/^Tu prueba de Cuadranova termina el /);
    expect(porVencer[0].texto).toMatch(/https?:\/\/\S+\/planes/);
    // Ni el administrador inactivo ni el mesero.
    expect(porVencer[0].para).toEqual([correo('por-vencer')]);
    expect(enviadosA('admin-inactivo')).toHaveLength(0);
    expect(enviadosA('mesero')).toHaveLength(0);

    const vencida = enviadosA('vencida');
    expect(vencida).toHaveLength(1);
    expect(vencida[0].asunto).toContain('terminó');

    expect(enviadosA('vencida-hace-mucho')).toHaveLength(0);
    expect(enviadosA('ya-paga')).toHaveLength(0);
    expect(fake.enviados.some((c) => c.para.some((p) => p.endsWith('@sin-correo.local')))).toBe(false);

    // La segunda corrida no repite nada.
    await t.container.avisarFinDePrueba.ejecutar();
    expect(enviadosA('por-vencer')).toHaveLength(1);
    expect(enviadosA('vencida')).toHaveLength(1);
  });

  it('si el envío falla no se registra, y la próxima corrida lo reintenta', async () => {
    await restaurante({ trialEndsAt: new Date(Date.now() + DIA) }, [{ quien: 'reintento', role: 'Admin' }]);

    fake.fallar = true;
    const conFallo = await t.container.avisarFinDePrueba.ejecutar();
    expect(conFallo.fallidos).toBeGreaterThanOrEqual(1);
    expect(enviadosA('reintento')).toHaveLength(0);

    fake.fallar = false;
    await t.container.avisarFinDePrueba.ejecutar();
    expect(enviadosA('reintento')).toHaveLength(1);
  });
});
