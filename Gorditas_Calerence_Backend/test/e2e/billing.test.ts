import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import Stripe from 'stripe';
import { createTestApp, type TestApp } from '../helpers/app';
import { tokenFor } from '../helpers/auth';
import { adminPrisma, createTestTenant, deleteTestTenant, type TestTenant } from '../helpers/db';
import { FakePaymentProvider } from '../../src/infrastructure/stripe/FakePaymentProvider';

const SECRET = 'whsec_test_kustodela';
const RUN = Date.now().toString(36);
const evt = (name: string) => `evt_${name}_${RUN}`;
const SUB = `sub_${RUN}`;
const PRICES = { basico: 'price_basico_test', profesional: 'price_pro_test', empresarial: 'price_emp_test' };

describe('Billing', () => {
  let t: TestApp;
  let fake: FakePaymentProvider;
  let tenant: TestTenant;
  let admin: string;
  let mesero: string;
  const stripe = new Stripe('sk_test_placeholder');
  const api = () => request(t.app);
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  function signed(event: Record<string, unknown>) {
    const payload = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    return api().post('/api/billing/webhook').set('stripe-signature', signature).set('Content-Type', 'application/json').send(payload);
  }

  beforeAll(async () => {
    fake = new FakePaymentProvider();
    t = await createTestApp({
      paymentProvider: fake,
      env: { STRIPE_WEBHOOK_SECRET: SECRET, STRIPE_PRICE_BASICO: PRICES.basico, STRIPE_PRICE_PROFESIONAL: PRICES.profesional, STRIPE_PRICE_EMPRESARIAL: PRICES.empresarial },
    });
    tenant = await createTestTenant(t.container.prisma, { trialEndsAt: new Date(Date.now() - 86_400_000) }); // trial vencido
    admin = await tokenFor(t.keys, { userId: 'adm', orgId: tenant.orgId, roles: ['Admin'], email: 'adm@test.local' });
    mesero = await tokenFor(t.keys, { userId: 'mes', orgId: tenant.orgId, roles: ['Mesero'] });
  });

  afterAll(async () => {
    // pos_app no puede borrar stripe_events (por diseño): limpiar con el rol migrador
    const admin = adminPrisma();
    await admin.stripeEvent.deleteMany({ where: { id: { endsWith: RUN } } });
    await admin.$disconnect();
    await deleteTestTenant(t.container.prisma, tenant.id);
    await t.container.shutdown();
  });

  it('planes públicos y estado inicial', async () => {
    const plans = await api().get('/api/billing/plans');
    expect(plans.status).toBe(200);
    expect(plans.body.data.map((p: { id: string }) => p.id)).toEqual(['basico', 'profesional', 'empresarial']);
    const status = await api().get('/api/billing/status').set(auth(admin));
    expect(status.status).toBe(200);
    expect(status.body.data).toMatchObject({ plan: 'trial', planStatus: 'trial', maxUsuarios: 3 });
    // el guard de plan no aplica a billing aunque el trial esté vencido
    expect((await api().get('/api/ordenes').set(auth(admin))).status).toBe(403);
  });

  it('create-checkout: solo Admin, plan válido, cliente creado y urls del subdominio', async () => {
    expect((await api().post('/api/billing/create-checkout').set(auth(mesero)).send({ plan: 'basico' })).status).toBe(403);
    const bad = await api().post('/api/billing/create-checkout').set(auth(admin)).send({ plan: 'oro' });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toBe('Plan no válido');

    const res = await api().post('/api/billing/create-checkout').set(auth(admin)).send({ plan: 'profesional' });
    expect(res.status).toBe(200);
    expect(res.body.data.url).toMatch(/^https:\/\/checkout\.fake\.local\//);
    const checkout = fake.checkouts[0];
    const base = t.container.urls.tenantUrl(tenant.slug);
    expect(checkout).toMatchObject({ priceId: PRICES.profesional, successUrl: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`, cancelUrl: `${base}/planes` });
    expect(checkout.metadata).toEqual({ tenantId: tenant.id, plan: 'profesional' });
    const customerId = await t.container.tenants.getStripeCustomerId(tenant.id);
    expect(customerId).toMatch(/^cus_fake_/);
    expect(fake.customers.get(customerId!)?.email).toBe('adm@test.local');

    // segundo checkout reutiliza el cliente
    await api().post('/api/billing/create-checkout').set(auth(admin)).send({ plan: 'basico' });
    expect(fake.customers.size).toBe(1);

    const portal = await api().post('/api/billing/create-portal').set(auth(admin));
    expect(portal.status).toBe(200);
    expect(portal.body.data.url).toContain(customerId);
  });

  it('webhook: firma inválida, checkout completado idempotente y ciclo de la suscripción', async () => {
    const customerId = await t.container.tenants.getStripeCustomerId(tenant.id);
    fake.setSubscription({ id: SUB, status: 'active', customerId, priceId: PRICES.profesional, metadata: { tenantId: tenant.id } });

    const bad = await api().post('/api/billing/webhook').set('stripe-signature', 't=1,v1=abc').set('Content-Type', 'application/json').send('{}');
    expect(bad.status).toBe(400);
    expect((await api().post('/api/billing/webhook').set('Content-Type', 'application/json').send('{}')).status).toBe(400);

    const completed = {
      id: evt('checkout_1'),
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_1', customer: customerId, subscription: SUB, metadata: { tenantId: tenant.id, plan: 'basico' } } },
    };
    const first = await signed(completed);
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ received: true, handled: true });
    const after = await t.container.tenants.findById(tenant.id);
    // el plan sale del price id real (profesional), no del metadata (basico)
    expect(after).toMatchObject({ plan: 'profesional', planStatus: 'active', maxUsuarios: 10, trialEndsAt: null });

    const dup = await signed(completed);
    expect(dup.status).toBe(200);
    expect(dup.body).toEqual({ received: true, duplicate: true });
    const events = await t.container.prisma.stripeEvent.findMany({ where: { id: evt('checkout_1') } });
    expect(events).toHaveLength(1);
    expect(events[0].processedAt).not.toBeNull();

    // Ahora el guard deja pasar
    expect((await api().get('/api/ordenes').set(auth(admin))).status).toBe(200);

    // Fallo de pago → past_due (API nueva: parent.subscription_details)
    await signed({ id: evt('inv_fail'), type: 'invoice.payment_failed', data: { object: { id: 'in_1', parent: { subscription_details: { subscription: SUB } } } } });
    expect((await t.container.tenants.findById(tenant.id))!.planStatus).toBe('past_due');
    // Pago recuperado → active (API vieja: invoice.subscription)
    await signed({ id: evt('inv_paid'), type: 'invoice.paid', data: { object: { id: 'in_2', subscription: SUB } } });
    expect((await t.container.tenants.findById(tenant.id))!.planStatus).toBe('active');

    // Cambio de plan desde el portal → subscription.updated con otro price
    fake.setSubscription({ id: SUB, status: 'active', customerId, priceId: PRICES.basico, metadata: { tenantId: tenant.id } });
    await signed({ id: evt('sub_upd'), type: 'customer.subscription.updated', data: { object: { id: SUB } } });
    expect(await t.container.tenants.findById(tenant.id)).toMatchObject({ plan: 'basico', maxUsuarios: 3, planStatus: 'active' });

    // Cancelación
    await signed({ id: evt('sub_del'), type: 'customer.subscription.deleted', data: { object: { id: SUB } } });
    expect((await t.container.tenants.findById(tenant.id))!.planStatus).toBe('canceled');
    const status = await api().get('/api/billing/status').set(auth(admin));
    expect(status.body.data).toMatchObject({ plan: 'basico', planStatus: 'canceled' });
    expect((await api().get('/api/ordenes').set(auth(admin))).status).toBe(403);

    // Evento desconocido se registra y no falla
    const unknown = await signed({ id: evt('x'), type: 'charge.refunded', data: { object: { id: 'ch_1' } } });
    expect(unknown.body).toEqual({ received: true, handled: false });
  });

  it('un handler que falla responde 500 y guarda el error para reintento', async () => {
    const res = await signed({ id: evt('bad_sub'), type: 'checkout.session.completed', data: { object: { id: 'cs_9', subscription: 'sub_inexistente', metadata: { tenantId: tenant.id } } } });
    expect(res.status).toBe(500);
    const ev = await t.container.prisma.stripeEvent.findUniqueOrThrow({ where: { id: evt('bad_sub') } });
    expect(ev.error).toContain('sub_inexistente');
    expect(ev.processedAt).toBeNull();
  });
});
