import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultShop } from "../lib/content.ts";
import { BLESSING_SIZES } from "../lib/products.ts";
import { validateOrder } from "../lib/order.ts";
import { checkoutSessionParams } from "../lib/checkout-session.ts";
import { pickupDate } from "../lib/fulfilment.ts";

function orderFor(flavor, sizeOz, gift = true) {
  return {
    lines: [{ slug: flavor.slug, sizeOz, format: sizeOz === 3 ? "sampler" : "jar", qty: 1,
      ...(gift ? { gift: { id: "gift-check", recipientName: "Neighbor", address: "123 Example Lane", inVistancia: true } } : {}),
    }],
    jarsReturned: 0, blessingBags: 0,
    details: { method: "dropoff", name: "Test Customer", phone: "6235550100", runDate: pickupDate(), pickupPeriod: "morning" },
  };
}

test("all available flavors support 8 oz and 16 oz blessing gifts with a $7 add-on", () => {
  assert.deepEqual(BLESSING_SIZES, [8, 16]);
  assert.equal(defaultShop.blessingBag.price, 7);
  for (const flavor of defaultShop.flavors) {
    for (const size of BLESSING_SIZES) {
      const result = validateOrder(defaultShop, orderFor(flavor, size));
      assert.equal(result.ok, true, `${flavor.name}, ${size} oz`);
      assert.equal(result.totals.totalCents, flavor.sizePrices[size] * 100 + 700);
      const params = checkoutSessionParams(defaultShop, result.order, result.totals, "https://example.com");
      assert.equal(params.line_items[1].price_data.unit_amount, 700);
      assert.equal(params.line_items.reduce((sum, item) => sum + item.quantity * item.price_data.unit_amount, 0), result.totals.totalCents);
    }
  }
});

test("3 oz blessing gifts are refused while regular 3 oz bags remain available", () => {
  for (const flavor of defaultShop.flavors.filter(f => !f.sizes)) {
    const gift = validateOrder(defaultShop, orderFor(flavor, 3));
    assert.equal(gift.ok, false);
    assert.match(gift.errors.gifts, /8 oz or 1 lb/);
    assert.equal(validateOrder(defaultShop, orderFor(flavor, 3, false)).ok, true);
    const legacy = orderFor(flavor, 3);
    delete legacy.lines[0].sizeOz;
    assert.equal(validateOrder(defaultShop, legacy).ok, false);
  }
});
