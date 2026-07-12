/**
 * Script to create Stripe products and prices.
 * Run with: npx ts-node scripts/setup-stripe-products.ts
 * 
 * After running, copy the Price IDs to your .env file:
 *   STRIPE_PRICE_BASICO=price_...
 *   STRIPE_PRICE_PROFESIONAL=price_...
 *   STRIPE_PRICE_EMPRESARIAL=price_...
 */
import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as any,
});

const plans = [
  { id: 'basico', name: 'Kustodela POS - Básico', price: 29900, description: '3 usuarios, órdenes, cobro, inventario básico' },
  { id: 'profesional', name: 'Kustodela POS - Profesional', price: 59900, description: '10 usuarios, reportes, múltiples mesas, extras' },
  { id: 'empresarial', name: 'Kustodela POS - Empresarial', price: 99900, description: 'Usuarios ilimitados, múltiples sucursales, soporte prioritario' },
];

async function setupProducts() {
  console.log('🔄 Creating Stripe products and prices...\n');

  for (const plan of plans) {
    // Create product
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: { planId: plan.id },
    });

    // Create monthly price (amount in centavos)
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.price,
      currency: 'mxn',
      recurring: { interval: 'month' },
      metadata: { planId: plan.id },
    });

    console.log(`✅ ${plan.name}`);
    console.log(`   Product ID: ${product.id}`);
    console.log(`   Price ID:   ${price.id}`);
    console.log(`   → Add to .env: STRIPE_PRICE_${plan.id.toUpperCase()}=${price.id}\n`);
  }

  console.log('✅ All products created! Add the Price IDs to your .env file.');
}

setupProducts().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
