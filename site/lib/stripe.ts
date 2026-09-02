import Stripe from "stripe";

let cached: Stripe | null | undefined;

/**
 * Returns a Stripe client, or null when no secret key is configured. The site
 * has to stand up without payment keys so the rest of it can be reviewed, so
 * every caller branches on null rather than throwing at import time.
 */
export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  cached = key ? new Stripe(key) : null;
  return cached;
}

export function paymentsConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}
