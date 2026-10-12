import "server-only";
import type Stripe from "stripe";
import type { CheckoutTax, CheckoutTaxDisplay } from "@/lib/checkout-tax";

export async function readCheckoutTaxDisplay(
  config: { ready: boolean; rates: CheckoutTax },
  stripe: Pick<Stripe, "taxRates"> | null,
  live: boolean,
): Promise<CheckoutTaxDisplay> {
  if (!config.ready) return null;
  if (!config.rates) return { foodPercent: 0, giftJarPercent: 0 };
  if (!stripe) return null;
  try {
    const rates = await Promise.all([config.rates.foodRateId, config.rates.giftJarRateId].map(id =>
      stripe.taxRates.retrieve(id, {}, { timeout: 5000, maxNetworkRetries: 0 })));
    if (rates.some(rate => !rate.active || rate.inclusive || rate.livemode !== live || !Number.isFinite(rate.percentage) || rate.percentage < 0)) return null;
    return { foodPercent: rates[0].percentage, giftJarPercent: rates[1].percentage };
  } catch {
    console.warn("[checkout] tax display temporarily unavailable");
    return null;
  }
}
