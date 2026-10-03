import Stripe from 'stripe';
import type { CheckoutSessionInput, PaymentProvider, SubscriptionSnapshot, WebhookEvent, WebhookVerifier } from '../../shared/application/ports/PaymentProvider';
import { ValidationError } from '../../shared/domain/DomainError';

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, { typescript: true });
}

export class StripePaymentProvider implements PaymentProvider {
  constructor(private readonly stripe: Stripe) {}

  async ensureCustomer(input: { existingId: string | null; email: string; name: string; metadata: Record<string, string> }): Promise<string> {
    if (input.existingId) return input.existingId;
    const customer = await this.stripe.customers.create({ email: input.email || undefined, name: input.name, metadata: input.metadata });
    return customer.id;
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<{ id: string; url: string }> {
    const session = await this.stripe.checkout.sessions.create({
      customer: input.customerId,
      mode: 'subscription',
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: input.metadata,
      subscription_data: { metadata: input.metadata },
      locale: 'es-419',
    });
    if (!session.url) throw new Error('Stripe no devolvió url de checkout');
    return { id: session.id, url: session.url };
  }

  async createPortalSession(input: { customerId: string; returnUrl: string }): Promise<{ url: string }> {
    // En español, como el Checkout: sin esto el portal sale en inglés.
    const session = await this.stripe.billingPortal.sessions.create({ customer: input.customerId, return_url: input.returnUrl, locale: 'es-419' });
    return { url: session.url };
  }

  async retrieveSubscription(subscriptionId: string): Promise<SubscriptionSnapshot | null> {
    try {
      const sub = await this.stripe.subscriptions.retrieve(subscriptionId);
      return snapshotOf(sub);
    } catch (err) {
      if (err instanceof Stripe.errors.StripeInvalidRequestError && err.statusCode === 404) return null;
      throw err;
    }
  }

  changeSubscriptionPrice(subscriptionId: string, priceId: string): Promise<SubscriptionSnapshot> {
    return changeSubscriptionPrice(this.stripe, subscriptionId, priceId);
  }
}

/** Cambia el precio del único artículo de la suscripción. */
export async function changeSubscriptionPrice(stripe: Stripe, subscriptionId: string, priceId: string): Promise<SubscriptionSnapshot> {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const item = sub.items.data[0];
  if (!item) throw new Error(`La suscripción ${subscriptionId} no tiene artículos`);
  // Prorrateo inmediato: el plan y el cupo cambian ya, y la diferencia (a cobrar o a favor) va en
  // la siguiente factura.
  const updated = await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: item.id, price: priceId }],
    proration_behavior: 'create_prorations',
  });
  return snapshotOf(updated);
}

export function snapshotOf(sub: Stripe.Subscription): SubscriptionSnapshot {
  // La API actual reporta el periodo en cada artículo, no en la suscripción.
  const periodEnd = sub.items?.data?.[0]?.current_period_end ?? null;
  const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000) : null;
  // El portal programa la cancelación con `cancel_at` o con `cancel_at_period_end` según su
  // configuración: las dos significan «termina en tal fecha».
  const cancelAt = sub.cancel_at ? new Date(sub.cancel_at * 1000) : sub.cancel_at_period_end ? currentPeriodEnd : null;
  return {
    currentPeriodEnd,
    cancelAt,
    id: sub.id,
    status: sub.status,
    customerId: typeof sub.customer === 'string' ? sub.customer : (sub.customer?.id ?? null),
    priceId: sub.items?.data?.[0]?.price?.id ?? null,
    metadata: (sub.metadata ?? {}) as Record<string, string>,
  };
}

export class StripeWebhookVerifier implements WebhookVerifier {
  constructor(
    private readonly stripe: Stripe,
    private readonly secret: string,
  ) {}

  construct(rawBody: Buffer | string, signature: string | undefined): WebhookEvent {
    if (!signature) throw new ValidationError('Falta la firma del webhook', 'WEBHOOK_SIGNATURE');
    try {
      const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.secret);
      return { id: event.id, type: event.type, data: { object: event.data.object as unknown as Record<string, unknown> } };
    } catch (err) {
      throw new ValidationError(`Firma de webhook inválida: ${err instanceof Error ? err.message : String(err)}`, 'WEBHOOK_SIGNATURE');
    }
  }
}
