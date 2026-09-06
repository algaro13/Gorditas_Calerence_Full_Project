import type { Logger } from '../../../../shared/application/ports/Logger';
import type { PaymentProvider, SubscriptionSnapshot, WebhookEvent, WebhookVerifier } from '../../../../shared/application/ports/PaymentProvider';
import type { DomainUrls } from '../../../../shared/config/domain';
import type { AuthInfo } from '../../../../shared/domain/Auth';
import { ValidationError } from '../../../../shared/domain/DomainError';
import { PLAN_LIMITS, type TenantInfo } from '../../../../shared/domain/Tenant';
import type { TenantRepository } from '../../../../shared/application/ports/TenantRepository';
import { isPaidPlan, planFromPriceId, planStatusFromStripe, type PaidPlanId, type PriceToPlan } from '../../domain/plans';
import type { StripeEventStore } from '../ports/StripeEventStore';

export interface BillingConfig {
  priceIds: Partial<Record<PaidPlanId, string>>;
  priceToPlan: PriceToPlan;
}

export class CrearCheckout {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly payments: PaymentProvider,
    private readonly urls: DomainUrls,
    private readonly cfg: BillingConfig,
  ) {}

  async execute(tenant: TenantInfo, auth: AuthInfo, plan: unknown): Promise<{ url: string; sessionId: string }> {
    if (!isPaidPlan(plan)) throw new ValidationError('Plan no válido', 'PLAN_INVALIDO');
    const priceId = this.cfg.priceIds[plan];
    if (!priceId) throw new ValidationError('Plan no configurado en el proveedor de pagos', 'PLAN_NO_CONFIGURADO');

    const existing = await this.tenants.getStripeCustomerId(tenant.id);
    const customerId = await this.payments.ensureCustomer({ existingId: existing, email: auth.email, name: tenant.nombre, metadata: { tenantId: tenant.id, slug: tenant.slug } });
    if (customerId !== existing) await this.tenants.setStripeCustomerId(tenant.id, customerId);

    const base = this.urls.tenantUrl(tenant.slug);
    const session = await this.payments.createCheckoutSession({
      customerId,
      priceId,
      successUrl: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${base}/planes`,
      metadata: { tenantId: tenant.id, plan },
    });
    return { url: session.url, sessionId: session.id };
  }
}

export class CrearPortal {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly payments: PaymentProvider,
    private readonly urls: DomainUrls,
  ) {}

  async execute(tenant: TenantInfo): Promise<{ url: string }> {
    const customerId = await this.tenants.getStripeCustomerId(tenant.id);
    if (!customerId) throw new ValidationError('No hay suscripción activa', 'SIN_SUSCRIPCION');
    return this.payments.createPortalSession({ customerId, returnUrl: `${this.urls.tenantUrl(tenant.slug)}/` });
  }
}

export class EstadoBilling {
  constructor(private readonly tenants: TenantRepository) {}
  async execute(tenant: TenantInfo) {
    const fresh = (await this.tenants.findById(tenant.id)) ?? tenant;
    return { plan: fresh.plan, planStatus: fresh.planStatus, trialEndsAt: fresh.trialEndsAt, maxUsuarios: fresh.maxUsuarios };
  }
}

type Handler = (event: WebhookEvent) => Promise<void>;

/** Webhook idempotente: verifica firma, reserva el evento y aplica el estado real de la suscripción. */
export class ProcesarWebhook {
  private readonly handlers: Record<string, Handler>;

  constructor(
    private readonly verifier: WebhookVerifier,
    private readonly events: StripeEventStore,
    private readonly tenants: TenantRepository,
    private readonly payments: PaymentProvider,
    private readonly cfg: BillingConfig,
    private readonly logger: Logger,
    private readonly onTenantChanged?: (tenant: TenantInfo) => void,
  ) {
    this.handlers = {
      'checkout.session.completed': (e) => this.onCheckoutCompleted(e),
      'customer.subscription.created': (e) => this.onSubscriptionChanged(e),
      'customer.subscription.updated': (e) => this.onSubscriptionChanged(e),
      'customer.subscription.deleted': (e) => this.onSubscriptionDeleted(e),
      'invoice.paid': (e) => this.onInvoice(e, 'active'),
      'invoice.payment_failed': (e) => this.onInvoice(e, 'past_due'),
    };
  }

  async execute(rawBody: Buffer | string, signature: string | undefined): Promise<{ received: true; duplicate?: true; handled?: boolean }> {
    const event = this.verifier.construct(rawBody, signature);
    const isNew = await this.events.claim(event.id, event.type);
    if (!isNew) return { received: true, duplicate: true };

    const handler = this.handlers[event.type];
    if (!handler) {
      await this.events.markProcessed(event.id);
      return { received: true, handled: false };
    }
    try {
      await handler(event);
      await this.events.markProcessed(event.id);
      return { received: true, handled: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error('Error procesando webhook', { eventId: event.id, type: event.type, err: msg });
      await this.events.markError(event.id, msg);
      throw err;
    }
  }

  private async applySubscription(tenant: TenantInfo, sub: SubscriptionSnapshot): Promise<void> {
    const plan = planFromPriceId(this.cfg.priceToPlan, sub.priceId);
    const planStatus = planStatusFromStripe(sub.status);
    const updated = await this.tenants.updateBilling(tenant.id, {
      ...(plan ? { plan, maxUsuarios: PLAN_LIMITS[plan].maxUsuarios } : {}),
      planStatus,
      stripeSubscriptionId: sub.id,
      trialEndsAt: null,
    });
    this.onTenantChanged?.(updated);
    this.logger.info('Suscripción aplicada al tenant', { tenantId: tenant.id, plan: plan ?? tenant.plan, planStatus, subscriptionId: sub.id });
  }

  private async onCheckoutCompleted(event: WebhookEvent): Promise<void> {
    const session = event.data.object as { metadata?: Record<string, string>; subscription?: string | { id: string } | null; customer?: string | { id: string } | null };
    const tenantId = session.metadata?.tenantId;
    if (!tenantId) return;
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) return;
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const storedCustomer = await this.tenants.getStripeCustomerId(tenant.id);
    if (storedCustomer && customerId && storedCustomer !== customerId) {
      throw new Error(`El cliente de la sesión (${customerId}) no coincide con el del tenant`);
    }
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    if (!subscriptionId) return;
    const sub = await this.payments.retrieveSubscription(subscriptionId);
    if (!sub) throw new Error(`Suscripción ${subscriptionId} no encontrada`);
    await this.applySubscription(tenant, sub);
  }

  private async onSubscriptionChanged(event: WebhookEvent): Promise<void> {
    const obj = event.data.object as { id: string; metadata?: Record<string, string> };
    const sub = (await this.payments.retrieveSubscription(obj.id)) ?? null;
    if (!sub) return;
    const tenant = (await this.tenants.findByStripeSubscriptionId(sub.id)) ?? (sub.metadata.tenantId ? await this.tenants.findById(sub.metadata.tenantId) : null);
    if (!tenant) return;
    await this.applySubscription(tenant, sub);
  }

  private async onSubscriptionDeleted(event: WebhookEvent): Promise<void> {
    const obj = event.data.object as { id: string; metadata?: Record<string, string> };
    const tenant = (await this.tenants.findByStripeSubscriptionId(obj.id)) ?? (obj.metadata?.tenantId ? await this.tenants.findById(obj.metadata.tenantId) : null);
    if (!tenant) return;
    const updated = await this.tenants.updateBilling(tenant.id, { planStatus: 'canceled' });
    this.onTenantChanged?.(updated);
  }

  private async onInvoice(event: WebhookEvent, planStatus: 'active' | 'past_due'): Promise<void> {
    const invoice = event.data.object as {
      subscription?: string | { id: string } | null;
      parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null;
    };
    const raw = invoice.subscription ?? invoice.parent?.subscription_details?.subscription ?? null;
    const subscriptionId = typeof raw === 'string' ? raw : raw?.id;
    if (!subscriptionId) return;
    const tenant = await this.tenants.findByStripeSubscriptionId(subscriptionId);
    if (!tenant) return;
    const updated = await this.tenants.updateBilling(tenant.id, { planStatus });
    this.onTenantChanged?.(updated);
  }
}
