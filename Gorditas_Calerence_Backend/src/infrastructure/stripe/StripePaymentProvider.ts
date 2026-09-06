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
    const session = await this.stripe.billingPortal.sessions.create({ customer: input.customerId, return_url: input.returnUrl });
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
}

export function snapshotOf(sub: Stripe.Subscription): SubscriptionSnapshot {
  return {
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
