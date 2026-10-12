import "server-only";
import Stripe from "stripe";
import { mockKeysValid } from "@/lib/mock-policy";
import { checkoutTaxConfiguration } from "@/lib/checkout-tax";
export function mockTaxConfiguration() {
  return checkoutTaxConfiguration({ ...process.env, STRIPE_FOOD_TAX_RATE_ID: process.env.STRIPE_MOCK_FOOD_TAX_RATE_ID, STRIPE_GIFT_JAR_TAX_RATE_ID: process.env.STRIPE_MOCK_GIFT_JAR_TAX_RATE_ID });
}
export function getMockStripe() { return mockKeysValid(process.env) ? new Stripe(process.env.STRIPE_MOCK_SECRET_KEY!) : null; }
export function mockPaymentsReady() { return mockKeysValid(process.env) && Boolean(process.env.STRIPE_MOCK_WEBHOOK_SECRET?.startsWith("whsec_")) && mockTaxConfiguration().ready; }
