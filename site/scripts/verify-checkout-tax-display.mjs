// Explicit protected-build verification. No payment, customer or bake hold is created.
import assert from "node:assert/strict";
import Stripe from "stripe";
import { defaultShop } from "../lib/content.ts";
import { priceOrder } from "../lib/cart.ts";
import { checkoutTaxConfiguration, checkoutTaxTotal } from "../lib/checkout-tax.ts";
import { checkoutSessionParams } from "../lib/checkout-session.ts";

assert.equal(process.env.VERCEL_ENV, "production");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 20000, maxNetworkRetries: 1 });
const account = await stripe.accounts.retrieve();
assert.equal(account.id, "acct_1UECha5dmwkQeT55");
const config = checkoutTaxConfiguration(process.env);
assert.ok(config.ready && config.rates);
const [food, jar] = await Promise.all([config.rates.foodRateId, config.rates.giftJarRateId].map(id => stripe.taxRates.retrieve(id)));
for (const rate of [food, jar]) assert.ok(rate.active && rate.livemode && !rate.inclusive);
const display = { foodPercent: food.percentage, giftJarPercent: jar.percentage };
const shop = { ...defaultShop, flavors: [{ ...defaultShop.flavors[0], sizePrices: { 3: 1.43, 8: 3.33, 16: 9.99 } }] };
const line = (extra = {}) => ({ slug: shop.flavors[0].slug, format: "bag", sizeOz: 8, qty: 1, ...extra });
const gift = { id: "tax-check", recipientName: "Example Neighbor", address: "Example Vistancia address", inVistancia: true };
for (const [name, lines] of [
  ["food", [line()]],
  ["quantity-rounding", [line({ qty: 3 })]],
  ["separate-lines-rounding", [line(), line({ sizeOz: 3 })]],
  ["gift", [line({ gift, format: "jar", qty: 2 })]],
  ["mixed", [line({ qty: 3 }), line({ gift, format: "jar", sizeOz: 16 })]],
]) {
  const totals = priceOrder(shop, lines, { jarsReturned: 0, blessingBags: 0 });
  const order = { lines, jarsReturned: 0, blessingBags: 0, details: { method: "dropoff", name: "Checkout Photo Tax Verification 2026-10-08", phone: "6235550100", runDate: "2026-10-16", pickupPeriod: "morning" } };
  const params = checkoutSessionParams(shop, order, totals, "https://heavensharvestpantry.com", undefined, config.rates);
  let session;
  try {
    session = await stripe.checkout.sessions.create(params);
    assert.equal(session.payment_status, "unpaid");
    assert.equal(session.amount_subtotal, totals.totalCents);
    assert.equal(session.total_details.amount_tax, checkoutTaxTotal(shop, totals, display), name);
    assert.equal(session.amount_total, totals.totalCents + checkoutTaxTotal(shop, totals, display));
    console.log(JSON.stringify({ checkoutTaxVerified: name, subtotal: session.amount_subtotal, tax: session.total_details.amount_tax, total: session.amount_total }));
  } finally {
    if (session?.status === "open") await stripe.checkout.sessions.expire(session.id);
  }
}
console.log("Tax preview matches live Stripe. All verification sessions expired; no payment, email or bake hold created.");
