import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';
import { snapshotOf } from '../../src/infrastructure/stripe/StripePaymentProvider';

const FIN = 1_793_620_800; // 2026-11-02T12:00:00Z

function sub(extra: Partial<Stripe.Subscription>): Stripe.Subscription {
  return {
    id: 'sub_1',
    status: 'active',
    customer: 'cus_1',
    metadata: {},
    cancel_at: null,
    cancel_at_period_end: false,
    items: { data: [{ price: { id: 'price_1' }, current_period_end: FIN }] },
    ...extra,
  } as unknown as Stripe.Subscription;
}

describe('snapshotOf: fechas de la suscripción', () => {
  it('el fin de periodo sale del primer artículo', () => {
    expect(snapshotOf(sub({}))).toMatchObject({ currentPeriodEnd: new Date(FIN * 1000), cancelAt: null });
  });

  it('cancel_at_period_end termina al fin del periodo', () => {
    expect(snapshotOf(sub({ cancel_at_period_end: true })).cancelAt).toEqual(new Date(FIN * 1000));
  });

  it('cancel_at manda sobre el fin de periodo', () => {
    const otra = FIN - 86_400;
    expect(snapshotOf(sub({ cancel_at: otra, cancel_at_period_end: true })).cancelAt).toEqual(new Date(otra * 1000));
  });

  it('sin artículos no inventa fechas', () => {
    expect(snapshotOf(sub({ items: { data: [] } as unknown as Stripe.Subscription['items'] }))).toMatchObject({ currentPeriodEnd: null, cancelAt: null });
  });
});
