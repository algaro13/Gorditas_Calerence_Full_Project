export interface SubscriptionSnapshot {
  id: string;
  /** Estado tal como lo reporta el proveedor (active, trialing, past_due, canceled, unpaid, ...). */
  status: string;
  customerId: string | null;
  priceId: string | null;
  metadata: Record<string, string>;
}

export interface CheckoutSessionInput {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

/** Proveedor de cobros (Stripe en producción, Fake en pruebas). */
export interface PaymentProvider {
  ensureCustomer(input: { existingId: string | null; email: string; name: string; metadata: Record<string, string> }): Promise<string>;
  createCheckoutSession(input: CheckoutSessionInput): Promise<{ id: string; url: string }>;
  createPortalSession(input: { customerId: string; returnUrl: string }): Promise<{ url: string }>;
  retrieveSubscription(subscriptionId: string): Promise<SubscriptionSnapshot | null>;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

/** Verifica la firma del webhook con el body crudo y devuelve el evento. Lanza si la firma es inválida. */
export interface WebhookVerifier {
  construct(rawBody: Buffer | string, signature: string | undefined): WebhookEvent;
}
