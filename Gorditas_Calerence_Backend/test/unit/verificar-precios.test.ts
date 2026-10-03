import { describe, expect, it } from 'vitest';
import { FakePaymentProvider } from '../../src/infrastructure/stripe/FakePaymentProvider';
import { VerificarPrecios } from '../../src/modules/billing/application/use-cases/VerificarPrecios';
import { PLAN_CATALOG } from '../../src/modules/billing/domain/plans';

const cfg = {
  priceIds: { basico: 'price_b', profesional: 'price_p', empresarial: 'price_e' },
  priceToPlan: { price_b: 'basico' as const, price_p: 'profesional' as const, price_e: 'empresarial' as const },
};

function conPreciosDelCatalogo(): FakePaymentProvider {
  const fake = new FakePaymentProvider();
  for (const p of PLAN_CATALOG) fake.prices.set(cfg.priceIds[p.id], { amount: p.price, currency: 'mxn', interval: 'month' });
  return fake;
}

describe('VerificarPrecios', () => {
  it('con Stripe igual al catálogo, nada que decir', async () => {
    expect(await new VerificarPrecios(conPreciosDelCatalogo(), cfg).ejecutar()).toEqual([]);
  });

  it('un importe distinto se nombra con el plan y las dos cantidades', async () => {
    const fake = conPreciosDelCatalogo();
    fake.prices.set('price_b', { amount: 349, currency: 'mxn', interval: 'month' });
    const d = await new VerificarPrecios(fake, cfg).ejecutar();
    expect(d).toEqual([{ plan: 'basico', priceId: 'price_b', motivo: 'Stripe cobra 349 y el catálogo anuncia 299' }]);
  });

  it('moneda, periodicidad y precios que no existen también', async () => {
    const fake = conPreciosDelCatalogo();
    fake.prices.set('price_p', { amount: 599, currency: 'usd', interval: 'year' });
    fake.prices.delete('price_e');
    const motivos = (await new VerificarPrecios(fake, cfg).ejecutar()).map((x) => `${x.plan}: ${x.motivo}`);
    expect(motivos).toEqual([
      'profesional: Stripe cobra en usd y el catálogo en MXN',
      'profesional: Stripe cobra cada year y el catálogo es mensual',
      'empresarial: el precio no existe en Stripe',
    ]);
  });

  it('un plan sin precio configurado no se revisa', async () => {
    const d = await new VerificarPrecios(new FakePaymentProvider(), { priceIds: {}, priceToPlan: {} }).ejecutar();
    expect(d).toEqual([]);
  });
});
