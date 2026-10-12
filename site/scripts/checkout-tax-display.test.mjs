import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { defaultShop } from "../lib/content.ts";
import { priceOrder } from "../lib/cart.ts";
import { checkoutTaxTotal } from "../lib/checkout-tax.ts";
import { checkoutSessionParams } from "../lib/checkout-session.ts";
registerHooks({ resolve(specifier, context, next) {
  return specifier === "server-only" ? { url: "data:text/javascript,export {};", shortCircuit: true } : next(specifier, context);
} });
const { readCheckoutTaxDisplay } = await import("../lib/checkout-tax-source.ts");
const rates = { foodPercent: 1.6, giftJarPercent: 8.1 };
const config = { ready: true, rates: { foodRateId: "txr_food", giftJarRateId: "txr_jar" } };
const gift = { id: "test", recipientName: "Neighbor", address: "Sample Vistancia address", inVistancia: true };
const line = (extra = {}) => ({ slug: defaultShop.flavors[0].slug, format: "bag", sizeOz: 8, qty: 1, ...extra });
const totals = lines => priceOrder(defaultShop, lines, { jarsReturned: 0, blessingBags: 0 });

test("food, gift and mixed basket previews match the separate Stripe line amounts", () => {
  for (const lines of [[line()], [line({ gift, format: "jar" })], [line({ qty: 3 }), line({ gift, format: "jar", qty: 2 })]]) {
    const priced = totals(lines);
    const order = { lines, jarsReturned: 0, blessingBags: 0, details: { runDate: "2026-10-16", pickupPeriod: "morning" } };
    const params = checkoutSessionParams(defaultShop, order, priced, "https://example.com", undefined, config.rates);
    const expected = params.line_items.reduce((sum, item) => sum + Math.round(item.quantity * item.price_data.unit_amount * (item.tax_rates[0] === "txr_food" ? 0.016 : 0.081)), 0);
    assert.equal(checkoutTaxTotal(defaultShop, priced, rates), expected);
  }
});
test("quantities, removal and empty baskets recompute tax without stale amounts", () => {
  const single = checkoutTaxTotal(defaultShop, totals([line()]), rates);
  assert.equal(checkoutTaxTotal(defaultShop, totals([line({ qty: 2 })]), rates), single * 2);
  assert.equal(checkoutTaxTotal(defaultShop, totals([]), rates), 0);
  assert.equal(checkoutTaxTotal(defaultShop, totals([line()]), null), null);
  assert.equal(checkoutTaxTotal(defaultShop, totals([line()]), { foodPercent: 0, giftJarPercent: 0 }), 0);
});
test("tax rounds each extended Stripe line, not each individual unit", () => {
  const shop = { ...defaultShop, flavors: [{ ...defaultShop.flavors[0], sizePrices: { 3: 1.43, 8: 3.33, 16: 9.99 } }] };
  const priced = priceOrder(shop, [line({ qty: 3 })], { jarsReturned: 0, blessingBags: 0 });
  assert.equal(checkoutTaxTotal(shop, priced, rates), 16);
});
test("only an explicit approved tax-free decision displays zero without Stripe", async () => {
  assert.equal(await readCheckoutTaxDisplay({ ready: false, rates: null }, null, true), null);
  assert.deepEqual(await readCheckoutTaxDisplay({ ready: true, rates: null }, null, true), { foodPercent: 0, giftJarPercent: 0 });
  assert.equal(await readCheckoutTaxDisplay(config, null, true), null);
});
test("public tax data comes from active exclusive rates in the correct payment mode", async () => {
  const client = overrides => ({ taxRates: { retrieve: async id => ({ active: true, inclusive: false, livemode: true, percentage: id === "txr_food" ? 1.6 : 8.1, ...overrides }) } });
  assert.deepEqual(await readCheckoutTaxDisplay(config, client(), true), rates);
  for (const override of [{ active: false }, { inclusive: true }, { livemode: false }, { percentage: NaN }, { percentage: -1 }]) {
    assert.equal(await readCheckoutTaxDisplay(config, client(override), true), null);
  }
  assert.equal(await readCheckoutTaxDisplay(config, { taxRates: { retrieve: async () => { throw new Error("offline"); } } }, true), null);
});
