export interface SubscriptionSnapshot {
  id: string;
  /** Estado tal como lo reporta el proveedor (active, trialing, past_due, canceled, unpaid, ...). */
  status: string;
  customerId: string | null;
  priceId: string | null;
  metadata: Record<string, string>;
  /** Fin del periodo pagado. */
  currentPeriodEnd: Date | null;
  /** Cuándo termina por una cancelación programada; null si no hay. */
  cancelAt: Date | null;
}

export interface CheckoutSessionInput {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

/** Un precio tal como lo tiene el proveedor. */
export interface PriceSnapshot {
  /** En la unidad mayor de la moneda (pesos, no centavos). */
  amount: number;
  /** En minúsculas, como lo da Stripe: `mxn`. */
  currency: string;
  /** `month`, `year`… o null si no es recurrente. */
  interval: string | null;
}

/** Proveedor de cobros (Stripe en producción, Fake en pruebas). */
export interface PaymentProvider {
  ensureCustomer(input: { existingId: string | null; email: string; name: string; metadata: Record<string, string> }): Promise<string>;
  createCheckoutSession(input: CheckoutSessionInput): Promise<{ id: string; url: string }>;
  createPortalSession(input: { customerId: string; returnUrl: string }): Promise<{ url: string }>;
  retrieveSubscription(subscriptionId: string): Promise<SubscriptionSnapshot | null>;
  /** Cambia el precio de la suscripción existente, prorrateando en el momento. */
  changeSubscriptionPrice(subscriptionId: string, priceId: string): Promise<SubscriptionSnapshot>;
  /** El precio configurado; null si no existe. */
  retrievePrice(priceId: string): Promise<PriceSnapshot | null>;
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
