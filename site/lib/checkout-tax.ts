/** Tax decisions are explicit production configuration, never inferred as zero. */
import { blessingSurchargeCents, type Totals } from "@/lib/cart";
import type { Shop } from "@/lib/content";

export type CheckoutTax = { foodRateId: string; giftJarRateId: string } | null;
/** Public percentages only; null means unavailable, never tax-free. */
export type CheckoutTaxDisplay = { foodPercent: number; giftJarPercent: number } | null;

export function checkoutTaxTotal(shop: Shop, totals: Totals, rates: CheckoutTaxDisplay): number | null {
  if (!rates || totals.jarCreditAppliedCents > 0) return null;
  const tax = (amount: number, percentage: number) => Math.round(amount * Math.round(percentage * 10000) / 1000000);
  let cents = 0;
  for (const p of totals.lines) {
    const surcharge = p.line.gift ? blessingSurchargeCents(shop) : 0;
    cents += tax((p.unitCents - surcharge) * p.line.qty, rates.foodPercent);
    if (surcharge) cents += tax(surcharge * p.line.qty, rates.giftJarPercent);
  }
  return cents + tax(totals.blessingCents, rates.foodPercent) + tax(totals.giftJarCents, rates.giftJarPercent);
}

export function checkoutTaxConfiguration(env: Record<string, string | undefined>): { ready: boolean; rates: CheckoutTax } {
  if (env.CHECKOUT_TAX_APPROVED !== "true") return { ready: false, rates: null };
  if (env.CHECKOUT_TAX_MODE === "none") return { ready: true, rates: null };
  if (env.CHECKOUT_TAX_MODE === "manual" && /^txr_/.test(env.STRIPE_FOOD_TAX_RATE_ID ?? "") && /^txr_/.test(env.STRIPE_GIFT_JAR_TAX_RATE_ID ?? "")) {
    return { ready: true, rates: { foodRateId: env.STRIPE_FOOD_TAX_RATE_ID!, giftJarRateId: env.STRIPE_GIFT_JAR_TAX_RATE_ID! } };
  }
  return { ready: false, rates: null };
}
