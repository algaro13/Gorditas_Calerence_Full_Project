import type { PaymentProvider } from '../../../../shared/application/ports/PaymentProvider';
import { PLAN_CATALOG, type PaidPlanId } from '../../domain/plans';
import type { BillingConfig } from './Billing';

export interface DiferenciaDePrecio {
  plan: PaidPlanId;
  priceId: string;
  motivo: string;
}

/**
 * Compara los precios configurados en Stripe (`STRIPE_PRICE_*`) con el catálogo.
 *
 * El catálogo es lo que las pantallas anuncian; Stripe es lo que se cobra. Si alguien cambia un
 * precio en Stripe y no en el catálogo —o al revés—, se cobra una cantidad y se anuncia otra, y
 * nada lo notaba. Se corre al arrancar y solo avisa: un precio mal puesto no debe tumbar el POS.
 */
export class VerificarPrecios {
  constructor(
    private readonly payments: PaymentProvider,
    private readonly cfg: BillingConfig,
  ) {}

  async ejecutar(): Promise<DiferenciaDePrecio[]> {
    const diferencias: DiferenciaDePrecio[] = [];
    for (const plan of PLAN_CATALOG) {
      const priceId = this.cfg.priceIds[plan.id];
      // Sin precio configurado, contratar ese plan ya responde PLAN_NO_CONFIGURADO.
      if (!priceId) continue;
      const precio = await this.payments.retrievePrice(priceId);
      if (!precio) {
        diferencias.push({ plan: plan.id, priceId, motivo: 'el precio no existe en Stripe' });
        continue;
      }
      if (precio.amount !== plan.price) {
        diferencias.push({ plan: plan.id, priceId, motivo: `Stripe cobra ${precio.amount} y el catálogo anuncia ${plan.price}` });
      }
      if (precio.currency !== plan.currency.toLowerCase()) {
        diferencias.push({ plan: plan.id, priceId, motivo: `Stripe cobra en ${precio.currency} y el catálogo en ${plan.currency}` });
      }
      if (precio.interval !== 'month') {
        diferencias.push({ plan: plan.id, priceId, motivo: `Stripe cobra cada ${precio.interval ?? 'una sola vez'} y el catálogo es mensual` });
      }
    }
    return diferencias;
  }
}
