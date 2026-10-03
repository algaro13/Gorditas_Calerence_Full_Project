import type { Logger } from '../../../../shared/application/ports/Logger';
import type { PaymentProvider, SubscriptionSnapshot, WebhookEvent, WebhookVerifier } from '../../../../shared/application/ports/PaymentProvider';
import type { DomainUrls } from '../../../../shared/config/domain';
import type { AuthInfo } from '../../../../shared/domain/Auth';
import { ConflictError, ValidationError } from '../../../../shared/domain/DomainError';
import { PLAN_LIMITS, type TenantInfo } from '../../../../shared/domain/Tenant';
import type { BillingUpdate, TenantRepository } from '../../../../shared/application/ports/TenantRepository';
import { isPaidPlan, planFromPriceId, planStatusFromStripe, type PaidPlanId, type PriceToPlan } from '../../domain/plans';
import type { StripeEventStore } from '../ports/StripeEventStore';

export interface BillingConfig {
  priceIds: Partial<Record<PaidPlanId, string>>;
  priceToPlan: PriceToPlan;
}

/** Correo guardado de un miembro del restaurante; null si no se conoce. */
export type CorreoDelMiembro = (tenantId: string, userId: string) => Promise<string | null>;

/**
 * Una suscripción viva es la que sigue cobrando: activa o con un pago pendiente. Una cancelada o
 * una prueba no lo son, y para esas sí se contrata con Checkout.
 */
async function suscripcionViva(tenants: TenantRepository, tenant: TenantInfo): Promise<string | null> {
  const fresh = (await tenants.findById(tenant.id)) ?? tenant;
  if (fresh.planStatus !== 'active' && fresh.planStatus !== 'past_due') return null;
  return tenants.getStripeSubscriptionId(tenant.id);
}

/** Lo que una suscripción dice del restaurante. Lo usan el webhook y el cambio de plan. */
function actualizacionDesde(cfg: BillingConfig, sub: SubscriptionSnapshot): BillingUpdate & { plan?: PaidPlanId } {
  const plan = planFromPriceId(cfg.priceToPlan, sub.priceId);
  return {
    ...(plan ? { plan, maxUsuarios: PLAN_LIMITS[plan].maxUsuarios } : {}),
    planStatus: planStatusFromStripe(sub.status),
    stripeSubscriptionId: sub.id,
    trialEndsAt: null,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAt: sub.cancelAt,
  };
}

export class CrearCheckout {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly payments: PaymentProvider,
    private readonly urls: DomainUrls,
    private readonly cfg: BillingConfig,
    private readonly correoDelMiembro: CorreoDelMiembro = async () => null,
  ) {}

  async execute(tenant: TenantInfo, auth: AuthInfo, plan: unknown): Promise<{ url: string; sessionId: string }> {
    if (!isPaidPlan(plan)) throw new ValidationError('Plan no válido', 'PLAN_INVALIDO');
    const priceId = this.cfg.priceIds[plan];
    if (!priceId) throw new ValidationError('Plan no configurado en el proveedor de pagos', 'PLAN_NO_CONFIGURADO');
    // Un segundo Checkout abre una segunda suscripción, que sigue cobrando junto a la primera
    // sin aparecer en ningún sitio. Quien ya tiene una cambia de plan con `change-plan`.
    if (await suscripcionViva(this.tenants, tenant)) {
      throw new ConflictError('Ya tienes una suscripción activa; cambia de plan en lugar de contratar otra', 'YA_SUSCRITO');
    }

    const existing = await this.tenants.getStripeCustomerId(tenant.id);
    // El access token de Zitadel no trae `email`: sin el respaldo, el cliente de Stripe se creaba
    // sin correo y el primer Checkout lo pedía a mano.
    const email = auth.email || (existing ? '' : ((await this.correoDelMiembro(tenant.id, auth.userId)) ?? ''));
    const customerId = await this.payments.ensureCustomer({ existingId: existing, email, name: tenant.nombre, metadata: { tenantId: tenant.id, slug: tenant.slug } });
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
    // Vuelve a la pantalla desde la que se abrió, no al panel.
    return this.payments.createPortalSession({ customerId, returnUrl: `${this.urls.tenantUrl(tenant.slug)}/suscripcion` });
  }
}

/** Cambia el plan de la suscripción que ya existe, con prorrateo inmediato. */
export class CambiarPlan {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly payments: PaymentProvider,
    private readonly cfg: BillingConfig,
    private readonly logger: Logger,
    private readonly onTenantChanged?: (tenant: TenantInfo) => void,
  ) {}

  async execute(tenant: TenantInfo, plan: unknown): Promise<TenantInfo> {
    if (!isPaidPlan(plan)) throw new ValidationError('Plan no válido', 'PLAN_INVALIDO');
    const priceId = this.cfg.priceIds[plan];
    if (!priceId) throw new ValidationError('Plan no configurado en el proveedor de pagos', 'PLAN_NO_CONFIGURADO');
    const subscriptionId = await suscripcionViva(this.tenants, tenant);
    if (!subscriptionId) throw new ValidationError('No hay una suscripción activa que cambiar', 'SIN_SUSCRIPCION');
    const actual = (await this.tenants.findById(tenant.id)) ?? tenant;
    if (actual.plan === plan) throw new ValidationError('Ya estás en ese plan', 'MISMO_PLAN');

    const sub = await this.payments.changeSubscriptionPrice(subscriptionId, priceId);
    // Se aplica ya, sin esperar el webhook: quien cambia de plan espera ver el cambio al volver a
    // la pantalla. El webhook llegará después con lo mismo y no cambiará nada.
    const updated = await this.tenants.updateBilling(tenant.id, actualizacionDesde(this.cfg, sub));
    this.onTenantChanged?.(updated);
    this.logger.info('Plan cambiado', { tenantId: tenant.id, de: actual.plan, a: updated.plan, subscriptionId });
    return updated;
  }
}

/** Personal activo del restaurante: los mismos que cuenta el cupo. */
export type ContarUsuariosActivos = (tenantId: string) => Promise<number>;

export class EstadoBilling {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly contarUsuariosActivos: ContarUsuariosActivos,
  ) {}
  async execute(tenant: TenantInfo) {
    const fresh = (await this.tenants.findById(tenant.id)) ?? tenant;
    const [usuariosActivos, customerId] = await Promise.all([this.contarUsuariosActivos(tenant.id), this.tenants.getStripeCustomerId(tenant.id)]);
    return {
      plan: fresh.plan,
      planStatus: fresh.planStatus,
      trialEndsAt: fresh.trialEndsAt,
      maxUsuarios: fresh.maxUsuarios,
      currentPeriodEnd: fresh.currentPeriodEnd,
      cancelAt: fresh.cancelAt,
      usuariosActivos,
      // Sin cliente el portal contesta 400: la pantalla no ofrece un botón que falla.
      tieneClienteStripe: customerId !== null,
    };
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
    const cambios = actualizacionDesde(this.cfg, sub);
    const updated = await this.tenants.updateBilling(tenant.id, cambios);
    this.onTenantChanged?.(updated);
    this.logger.info('Suscripción aplicada al tenant', { tenantId: tenant.id, plan: cambios.plan ?? tenant.plan, planStatus: cambios.planStatus, subscriptionId: sub.id });
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
    // La cancelación programada ya ocurrió: deja de ser una fecha por venir.
    const updated = await this.tenants.updateBilling(tenant.id, { planStatus: 'canceled', cancelAt: null });
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
