import { test } from "node:test";
import assert from "node:assert/strict";
import { ordersArePaused, pickupDate, pickupDateLabel } from "../lib/fulfilment.ts";
import { defaultShop } from "../lib/content.ts";
import { checkoutSessionParams } from "../lib/checkout-session.ts";
import { parseItems } from "../lib/orders.ts";
import { checkoutTaxConfiguration } from "../lib/checkout-tax.ts";
import { priceOrder, unitPriceCents } from "../lib/cart.ts";

test("ordering is open immediately without waiting for October 8", () => {
  assert.equal(ordersArePaused(), false);
});

test("approved sampler prices stay separate from full-size bag prices", () => {
  const granola = { ...defaultShop.flavors[0], bagPrice: 15, samplerPrice: 5 };
  const almonds = { ...defaultShop.flavors[0], name: "Candied Almonds", bagPrice: 18, samplerPrice: 6 };
  assert.equal(unitPriceCents(granola, "sampler"), 500);
  assert.equal(unitPriceCents(almonds, "sampler"), 600);
  assert.equal(unitPriceCents(granola, "bag"), 1500);
  assert.equal(unitPriceCents(almonds, "bag"), 1800);
});
test("launch orders are assigned to the approved October 16 pickup", () => {
  assert.equal(pickupDate(Date.parse("2026-10-08T10:00:00-07:00")), "2026-10-16");
  assert.equal(pickupDateLabel("2026-10-16"), "Friday, October 16");
});
test("the Tuesday cutoff is Arizona time and moves pickup forward a week", () => {
  assert.equal(pickupDate(Date.parse("2026-10-14T03:59:59Z")), "2026-10-16");
  assert.equal(pickupDate(Date.parse("2026-10-14T04:00:00Z")), "2026-10-23");
  assert.equal(pickupDate(Date.parse("2026-10-17T12:00:00-07:00")), "2026-10-23");
});
test("pickup rolls across year boundaries without using the server timezone", () => {
  assert.equal(pickupDate(Date.parse("2026-12-30T07:00:00Z")), "2027-01-08");
});

function validated(overrides = {}) {
  // Exercise payment construction separately from the evolving pickup form.
  const details = { method: "dropoff", name: "Checkout Test", phone: "6235550100", runDate: pickupDate(), runIndex: 0, address: "", note: "", prayer: "", blessingGiftJars: 1, ...overrides.details };
  const input = {
    lines: [{ slug: defaultShop.flavors[0].slug, format: "sampler", qty: 2 }],
    jarsReturned: 0, blessingBags: 2,
    ...overrides,
    details,
  };
  const totals = priceOrder(defaultShop, input.lines, { ...input, blessingGiftJars: details.blessingGiftJars });
  return { order: { ...input, lines: totals.lines.map(p => p.line), blessingBags: totals.blessingBags, details: { ...details, blessingGiftJars: totals.blessingGiftJars } }, totals };
}
test("Stripe's line items equal the displayed total, including gift jars", () => {
  const { order, totals } = validated();
  const params = checkoutSessionParams(defaultShop, order, totals, "https://example.com");
  assert.equal(params.line_items.reduce((sum, p) => sum + p.quantity * p.price_data.unit_amount, 0), totals.totalCents);
  assert.equal(totals.giftJarCents, 200);
  assert.match(params.line_items[0].price_data.product_data.name, /3 oz bag/);
  assert.equal(params.ui_mode, "embedded_page");
  assert.deepEqual(params.payment_method_types, ["card"]);
  assert.equal(params.success_url, undefined);
  assert.equal(params.cancel_url, undefined);
  assert.match(params.return_url, /^https:\/\/example.com\/order\/thank-you/);
});
test("gift jars cannot outnumber blessing bags or accept fractional quantities", () => {
  const { order, totals } = validated({ details: { method: "dropoff", name: "Checkout Test", phone: "6235550100", blessingGiftJars: 99.9 } });
  assert.equal(order.details.blessingGiftJars, 2);
  assert.equal(totals.giftJarCents, 400);
});
test("an absent tax decision never silently enables paid automatic tax", () => {
  const { order, totals } = validated();
  const params = checkoutSessionParams(defaultShop, order, totals, "https://example.com");
  assert.equal(params.automatic_tax, undefined);
  assert.equal(params.payment_intent_data.application_fee_amount, undefined);
});
test("the owner's order list recognizes sampler bags", () => {
  assert.deepEqual(parseItems("2x Honey Almond Crunch (sampler)"), [{ qty: 2, name: "Honey Almond Crunch", format: "sampler" }]);
});
test("tax approval alone cannot accidentally launch a tax-free checkout", () => {
  assert.equal(checkoutTaxConfiguration({}).ready, false);
  assert.equal(checkoutTaxConfiguration({ CHECKOUT_TAX_APPROVED: "true" }).ready, false);
  assert.equal(checkoutTaxConfiguration({ CHECKOUT_TAX_APPROVED: "true", CHECKOUT_TAX_MODE: "manual", STRIPE_FOOD_TAX_RATE_ID: "txr_food" }).ready, false);
  assert.equal(checkoutTaxConfiguration({ CHECKOUT_TAX_APPROVED: "true", CHECKOUT_TAX_MODE: "none" }).ready, true);
});
test("approved manual tax rates apply separately to food and gift jars", () => {
  const config = checkoutTaxConfiguration({ CHECKOUT_TAX_APPROVED: "true", CHECKOUT_TAX_MODE: "manual", STRIPE_FOOD_TAX_RATE_ID: "txr_food", STRIPE_GIFT_JAR_TAX_RATE_ID: "txr_packaging" });
  assert.equal(config.ready, true);
  const { order, totals } = validated();
  const params = checkoutSessionParams(defaultShop, order, totals, "https://example.com", undefined, config.rates);
  assert.deepEqual(params.line_items.map((p) => p.tax_rates), [["txr_food"], ["txr_food"], ["txr_packaging"]]);
  assert.equal(params.automatic_tax, undefined);
});
test("malformed basket entries are discarded without crashing checkout", () => {
  assert.equal(validated({ lines: [null, 1, { slug: "maple-pecan", format: "bag", qty: 1 }] }).totals.itemCount, 1);
});
