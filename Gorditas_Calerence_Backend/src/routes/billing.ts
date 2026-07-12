import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { hybridAuth, HybridAuthRequest } from '../middleware/hybrid-auth';
import { getTenantModel, getTenantUserModel } from '../config/master-db';
import { createResponse } from '../utils/helpers';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as any,
});

// Plan configuration
const PLANS: Record<string, { name: string; priceId: string; maxUsuarios: number }> = {
  basico: {
    name: 'Básico',
    priceId: process.env.STRIPE_PRICE_BASICO || '',
    maxUsuarios: 3,
  },
  profesional: {
    name: 'Profesional',
    priceId: process.env.STRIPE_PRICE_PROFESIONAL || '',
    maxUsuarios: 10,
  },
  empresarial: {
    name: 'Empresarial',
    priceId: process.env.STRIPE_PRICE_EMPRESARIAL || '',
    maxUsuarios: 999,
  },
};

// POST /api/billing/create-checkout — Create Stripe Checkout session
router.post('/create-checkout', hybridAuth, async (req: HybridAuthRequest, res: Response) => {
  try {
    const { plan } = req.body;

    if (!plan || !PLANS[plan]) {
      return res.status(400).json(createResponse(false, null, 'Plan no válido'));
    }

    const planConfig = PLANS[plan];
    const TenantUser = getTenantUserModel();
    const Tenant = getTenantModel();

    // Find user's tenant
    const tenantUser = await TenantUser.findOne({ entraOid: req.entraUser?.oid });
    if (!tenantUser) {
      return res.status(404).json(createResponse(false, null, 'Tenant no encontrado'));
    }

    const tenant = await Tenant.findById(tenantUser.tenantId);
    if (!tenant) {
      return res.status(404).json(createResponse(false, null, 'Tenant no encontrado'));
    }

    // Create or retrieve Stripe customer
    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.entraUser?.email || tenantUser.email,
        name: tenant.nombre,
        metadata: { tenantId: tenant._id.toString(), slug: tenant.slug },
      });
      customerId = customer.id;
      tenant.stripeCustomerId = customerId;
      await tenant.save();
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${req.header('Origin') || 'http://localhost:5173'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.header('Origin') || 'http://localhost:5173'}/planes`,
      metadata: { tenantId: tenant._id.toString(), plan },
      subscription_data: {
        metadata: { tenantId: tenant._id.toString(), plan },
      },
    });

    res.json(createResponse(true, { url: session.url, sessionId: session.id }));
  } catch (error: any) {
    console.error('Checkout error:', error.message);
    res.status(500).json(createResponse(false, null, 'Error al crear sesión de pago'));
  }
});

// POST /api/billing/webhook — Handle Stripe webhooks
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: Stripe.Event;

  try {
    // For webhook, we need raw body. If not available, use body directly
    const payload = (req as any).rawBody || JSON.stringify(req.body);
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } else {
      // Development mode without signature verification
      event = req.body as Stripe.Event;
    }
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const Tenant = getTenantModel();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;
        const plan = session.metadata?.plan;
        if (tenantId && plan) {
          await Tenant.findByIdAndUpdate(tenantId, {
            plan,
            planStatus: 'active',
            stripeSubscriptionId: session.subscription as string,
            maxUsuarios: PLANS[plan]?.maxUsuarios || 3,
          });
          console.log(`✅ Tenant ${tenantId} activated with plan ${plan}`);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (subscriptionId) {
          await Tenant.findOneAndUpdate(
            { stripeSubscriptionId: subscriptionId },
            { planStatus: 'active' }
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (subscriptionId) {
          await Tenant.findOneAndUpdate(
            { stripeSubscriptionId: subscriptionId },
            { planStatus: 'past_due' }
          );
          console.log(`⚠️ Payment failed for subscription ${subscriptionId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await Tenant.findOneAndUpdate(
          { stripeSubscriptionId: subscription.id },
          { planStatus: 'canceled' }
        );
        console.log(`❌ Subscription ${subscription.id} canceled`);
        break;
      }
    }
  } catch (error: any) {
    console.error('Webhook processing error:', error.message);
  }

  res.json({ received: true });
});

// POST /api/billing/create-portal — Create Stripe Customer Portal session
router.post('/create-portal', hybridAuth, async (req: HybridAuthRequest, res: Response) => {
  try {
    const TenantUser = getTenantUserModel();
    const Tenant = getTenantModel();

    const tenantUser = await TenantUser.findOne({ entraOid: req.entraUser?.oid });
    if (!tenantUser) {
      return res.status(404).json(createResponse(false, null, 'Tenant no encontrado'));
    }

    const tenant = await Tenant.findById(tenantUser.tenantId);
    if (!tenant || !tenant.stripeCustomerId) {
      return res.status(400).json(createResponse(false, null, 'No hay suscripción activa'));
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${req.header('Origin') || 'http://localhost:5173'}/`,
    });

    res.json(createResponse(true, { url: session.url }));
  } catch (error: any) {
    console.error('Portal error:', error.message);
    res.status(500).json(createResponse(false, null, 'Error al abrir portal de facturación'));
  }
});

// GET /api/billing/status — Get current billing status
router.get('/status', hybridAuth, async (req: HybridAuthRequest, res: Response) => {
  try {
    const TenantUser = getTenantUserModel();
    const Tenant = getTenantModel();

    const tenantUser = await TenantUser.findOne({ entraOid: req.entraUser?.oid });
    if (!tenantUser) {
      return res.status(404).json(createResponse(false, null, 'Tenant no encontrado'));
    }

    const tenant = await Tenant.findById(tenantUser.tenantId);
    if (!tenant) {
      return res.status(404).json(createResponse(false, null, 'Tenant no encontrado'));
    }

    res.json(createResponse(true, {
      plan: tenant.plan,
      planStatus: tenant.planStatus || 'trial',
      trialEndsAt: tenant.trialEndsAt,
      maxUsuarios: tenant.maxUsuarios || 3,
    }));
  } catch (error: any) {
    res.status(500).json(createResponse(false, null, 'Error al obtener estado de facturación'));
  }
});

// GET /api/billing/plans — Get available plans (public)
router.get('/plans', (req: Request, res: Response) => {
  const plans = [
    { id: 'basico', name: 'Básico', price: 299, currency: 'MXN', maxUsuarios: 3, features: ['Órdenes', 'Cobro', 'Inventario básico'] },
    { id: 'profesional', name: 'Profesional', price: 599, currency: 'MXN', maxUsuarios: 10, features: ['Todo en Básico', 'Reportes', 'Múltiples mesas', 'Extras'] },
    { id: 'empresarial', name: 'Empresarial', price: 999, currency: 'MXN', maxUsuarios: 999, features: ['Todo en Profesional', 'Usuarios ilimitados', 'Múltiples sucursales', 'Soporte prioritario'] },
  ];
  res.json(createResponse(true, plans));
});

export default router;
