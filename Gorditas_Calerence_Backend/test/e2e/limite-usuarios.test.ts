import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, type TestApp } from '../helpers/app';
import { tokenFor } from '../helpers/auth';
import { adminPrisma, createTestTenant, deleteTestTenant, type TestTenant } from '../helpers/db';
import { FakeIdentityProvider } from '../../src/infrastructure/zitadel/FakeIdentityProvider';
import { runAsTenant } from '../../src/shared/infrastructure/prisma/unit-of-work';
import Stripe from 'stripe';
import { FakePaymentProvider } from '../../src/infrastructure/stripe/FakePaymentProvider';
import { PLAN_LIMITS } from '../../src/shared/domain/Tenant';

/**
 * El límite de usuarios es lo que sostiene el cobro por plan: si se puede rodear, el plan
 * básico cuesta lo mismo que el empresarial. Se comprueba por los tres caminos que crean o
 * reactivan personal, no solo por el alta, que es el único que estaba cubierto.
 */
describe('Límite de usuarios del plan', () => {
  let t: TestApp;
  let fake: FakeIdentityProvider;
  let tenant: TestTenant;
  let admin: string;
  const api = () => request(t.app);
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const activos = () =>
    runAsTenant(t.container.prisma, tenant.id, (db) => db.tenantUser.count({ where: { activo: true } }));

  const invitar = (token: string, email: string) =>
    api().post('/api/usuarios').set(auth(token)).send({ nombre: 'Nuevo', apellido: 'Usuario', email, role: 'Mesero' });

  beforeAll(async () => {
    fake = new FakeIdentityProvider();
    t = await createTestApp({ identityProvider: fake });
    // Dos plazas: el admin ocupa una al entrar, queda una libre.
    tenant = await createTestTenant(t.container.prisma, { maxUsuarios: 2 });
    admin = await tokenFor(t.keys, { userId: 'admin-1', orgId: tenant.orgId, roles: ['Admin'], email: 'admin@test.local', name: 'Admin Uno' });
    await api().get('/api/usuarios').set(auth(admin));
    await new Promise((r) => setTimeout(r, 150));
  });

  afterAll(async () => {
    await deleteTestTenant(t.container.prisma, tenant.id);
    await t.container.shutdown();
  });

  it('el alta respeta el límite', async () => {
    expect(await activos()).toBe(1);

    expect((await invitar(admin, 'segundo@test.local')).status).toBe(201);
    expect(await activos()).toBe(2);

    const tercero = await invitar(admin, 'tercero@test.local');
    expect(tercero.status).toBe(403);
    expect(tercero.body.code).toBe('USER_LIMIT_REACHED');
    expect(await activos()).toBe(2);
  });

  it('desactivar libera una plaza y reactivar la vuelve a exigir', async () => {
    const lista = (await api().get('/api/usuarios').set(auth(admin))).body.data as Array<{ _id: string; email: string }>;
    const segundo = lista.find((u) => u.email === 'segundo@test.local')!;

    expect((await api().put(`/api/usuarios/${segundo._id}`).set(auth(admin)).send({ activo: false })).status).toBe(200);
    expect(await activos()).toBe(1);

    // Con la plaza libre entra otro, y ahora reactivar al primero debe chocar con el límite.
    expect((await invitar(admin, 'cuarto@test.local')).status).toBe(201);
    expect(await activos()).toBe(2);

    const reactivar = await api().put(`/api/usuarios/${segundo._id}`).set(auth(admin)).send({ activo: true });
    expect(reactivar.status).toBe(403);
    expect(reactivar.body.code).toBe('USER_LIMIT_REACHED');
    expect(await activos()).toBe(2);
  });

  // HUECO CONOCIDO. Marcada con .fails a propósito: hoy el espejo se salta el límite, así que
  // esta prueba "pasa" porque falla. El día que se cierre el hueco, empezará a dar error y
  // habrá que quitarle el .fails. Es la forma de que un fallo aceptado no se olvide.
  //
  // El camino es el que no pasa por /api/usuarios: alguien creado directamente en la consola
  // de Zitadel —el dueño de cada restaurante es ORG_OWNER de su organización— o una invitación
  // que creó la cuenta pero falló al escribir el espejo. En su primera petición, el espejo lo
  // da de alta sin mirar cuántas plazas quedan. Y como onMemberSeen no se espera, tampoco
  // podría rechazar la petición: el límite se aplica al dar de alta, no en tiempo de ejecución.
  it.fails('un usuario que existe en el proveedor pero no en el espejo no puede saltarse el límite', async () => {
    expect(await activos()).toBe(2);

    const colado = await tokenFor(t.keys, {
      userId: 'colado-1',
      orgId: tenant.orgId,
      roles: ['Mesero'],
      email: 'colado@test.local',
      name: 'Colado Uno',
    });
    await api().get('/api/ordenes').set(auth(colado));
    await new Promise((r) => setTimeout(r, 150));

    expect(await activos()).toBe(2);
  });
});

/**
 * El tope no es un número fijo: sale del plan contratado. Las pruebas de facturación
 * comprobaban que el plan *guarda* el número correcto, pero no que ese número se haga valer
 * — que son cosas distintas. Aquí se cierra ese eslabón, y de paso se cubre `empresarial`,
 * que no aparecía en ninguna prueba.
 */
describe('El tope sale del plan contratado', () => {
  const SECRETO = 'whsec_test_limite';
  const CORRIDA = Date.now().toString(36);
  const PRECIOS = { basico: 'price_b', profesional: 'price_p', empresarial: 'price_e' };

  let t: TestApp;
  let pagos: FakePaymentProvider;
  let idp: FakeIdentityProvider;
  let tenant: TestTenant;
  let admin: string;
  const stripe = new Stripe('sk_test_placeholder');
  const api = () => request(t.app);
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const activos = () =>
    runAsTenant(t.container.prisma, tenant.id, (db) => db.tenantUser.count({ where: { activo: true } }));

  /** Simula que Stripe confirma una suscripción a `plan`, que es como cambia el tope. */
  async function contratar(plan: keyof typeof PRECIOS, n: number) {
    const sub = `sub_${CORRIDA}_${n}`;
    const customerId = await t.container.tenants.getStripeCustomerId(tenant.id);
    pagos.setSubscription({ id: sub, status: 'active', customerId, priceId: PRECIOS[plan], metadata: { tenantId: tenant.id } });
    const evento = {
      id: `evt_${CORRIDA}_${n}`,
      type: 'checkout.session.completed',
      data: { object: { id: `cs_${n}`, customer: customerId, subscription: sub, metadata: { tenantId: tenant.id, plan } } },
    };
    const payload = JSON.stringify(evento);
    const firma = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRETO });
    const res = await api().post('/api/billing/webhook').set('stripe-signature', firma).set('Content-Type', 'application/json').send(payload);
    expect(res.status).toBe(200);
  }

  beforeAll(async () => {
    pagos = new FakePaymentProvider();
    idp = new FakeIdentityProvider();
    t = await createTestApp({
      paymentProvider: pagos,
      identityProvider: idp,
      env: { STRIPE_WEBHOOK_SECRET: SECRETO, STRIPE_PRICE_BASICO: PRECIOS.basico, STRIPE_PRICE_PROFESIONAL: PRECIOS.profesional, STRIPE_PRICE_EMPRESARIAL: PRECIOS.empresarial },
    });
    tenant = await createTestTenant(t.container.prisma, { maxUsuarios: 3 });
    admin = await tokenFor(t.keys, { userId: 'adm-plan', orgId: tenant.orgId, roles: ['Admin'], email: 'adm@plan.local', name: 'Admin Plan' });
    await api().get('/api/usuarios').set(auth(admin));
    await new Promise((r) => setTimeout(r, 150));
  });

  afterAll(async () => {
    const a = adminPrisma();
    await a.stripeEvent.deleteMany({ where: { id: { contains: CORRIDA } } });
    await a.$disconnect();
    await deleteTestTenant(t.container.prisma, tenant.id);
    await t.container.shutdown();
  });

  it('cada plan impone el tope que declara PLAN_LIMITS', async () => {
    let n = 0;
    for (const plan of ['basico', 'profesional', 'empresarial'] as const) {
      await contratar(plan, ++n);
      const estado = await api().get('/api/billing/status').set(auth(admin));
      expect(estado.body.data).toMatchObject({ plan, maxUsuarios: PLAN_LIMITS[plan].maxUsuarios });
    }
  });

  it('subir de plan amplia el tope de verdad, no solo el numero guardado', async () => {
    // De vuelta al plan chico: 3 plazas, el admin ocupa una.
    await contratar('basico', 10);
    const invitar = (email: string) =>
      api().post('/api/usuarios').set(auth(admin)).send({ nombre: 'U', apellido: 'no', email, role: 'Mesero' });

    expect((await invitar('p1@plan.local')).status).toBe(201);
    expect((await invitar('p2@plan.local')).status).toBe(201);
    expect(await activos()).toBe(3);

    const bloqueado = await invitar('p4@plan.local');
    expect(bloqueado.status).toBe(403);
    expect(bloqueado.body.code).toBe('USER_LIMIT_REACHED');

    // Mismo restaurante, mismo intento: solo cambia el plan.
    await contratar('profesional', 11);
    expect((await invitar('p4@plan.local')).status).toBe(201);
    expect(await activos()).toBe(4);
  });

  it('bajar de plan deja al restaurante por encima de su tope', async () => {
    // Viene de la prueba anterior: profesional con 4 activos. Al bajar a basico (3),
    // nadie es expulsado y el restaurante queda usando mas plazas de las que paga.
    expect(await activos()).toBe(4);
    await contratar('basico', 12);

    const estado = await api().get('/api/billing/status').set(auth(admin));
    expect(estado.body.data).toMatchObject({ plan: 'basico', maxUsuarios: 3 });

    expect(await activos()).toBe(4);

    const lista = await api().get('/api/usuarios').set(auth(admin));
    expect(lista.body.data.filter((u: { activo: boolean }) => u.activo)).toHaveLength(4);

    const otro = await api().post('/api/usuarios').set(auth(admin)).send({ nombre: 'U', apellido: 'no', email: 'p5@plan.local', role: 'Mesero' });
    expect(otro.status).toBe(403);
    expect(otro.body.code).toBe('USER_LIMIT_REACHED');
  });
});
