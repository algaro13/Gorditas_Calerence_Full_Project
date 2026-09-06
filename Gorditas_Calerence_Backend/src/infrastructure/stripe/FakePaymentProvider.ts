import { randomUUID } from 'node:crypto';
import type { CheckoutSessionInput, PaymentProvider, SubscriptionSnapshot } from '../../shared/application/ports/PaymentProvider';

/** Proveedor de cobros en memoria para pruebas y desarrollo sin Stripe. */
export class FakePaymentProvider implements PaymentProvider {
  readonly customers = new Map<string, { email: string; name: string }>();
  readonly checkouts: Array<CheckoutSessionInput & { id: string }> = [];
  readonly subscriptions = new Map<string, SubscriptionSnapshot>();

  async ensureCustomer(input: { existingId: string | null; email: string; name: string }): Promise<string> {
    if (input.existingId) return input.existingId;
    const id = `cus_fake_${randomUUID().slice(0, 8)}`;
    this.customers.set(id, { email: input.email, name: input.name });
    return id;
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<{ id: string; url: string }> {
    const id = `cs_fake_${randomUUID().slice(0, 8)}`;
    this.checkouts.push({ ...input, id });
    return { id, url: `https://checkout.fake.local/${id}` };
  }

  async createPortalSession(input: { customerId: string; returnUrl: string }): Promise<{ url: string }> {
    return { url: `https://portal.fake.local/${input.customerId}?return=${encodeURIComponent(input.returnUrl)}` };
  }

  async retrieveSubscription(subscriptionId: string): Promise<SubscriptionSnapshot | null> {
    return this.subscriptions.get(subscriptionId) ?? null;
  }

  /** Helper de pruebas: registra una suscripción viva. */
  setSubscription(sub: SubscriptionSnapshot): void {
    this.subscriptions.set(sub.id, sub);
  }
}
