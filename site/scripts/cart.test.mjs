// Unit tests for the money. Run: npm test
// These numbers are the contract: if a change here goes red, a customer would
// have been charged the wrong amount.
import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultShop } from "../lib/content.ts";
import {
  MAX_QTY_PER_LINE,
  formatMoney,
  priceOrder,
  sanitizeCart,
} from "../lib/cart.ts";
import { normalisePhone, orderMetadata, validateOrder } from "../lib/order.ts";

const shop = defaultShop;
const none = { jarsReturned: 0, blessingBags: 0 };

test("prices bags at the bag price", () => {
  const t = priceOrder(shop, [{ slug: "honey-almond-crunch", format: "bag", qty: 2 }], none);
  assert.equal(t.subtotalCents, 1800);
  assert.equal(t.totalCents, 1800);
  assert.equal(t.itemCount, 2);
});

test("prices jars at the jar price", () => {
  const t = priceOrder(shop, [{ slug: "honey-almond-crunch", format: "jar", qty: 1 }], none);
  assert.equal(t.totalCents, 1200);
});

test("drops a sold-out flavor rather than selling it", () => {
  const t = priceOrder(shop, [{ slug: "cinnamon-apple", format: "bag", qty: 1 }], none);
  assert.equal(t.itemCount, 0);
  assert.equal(t.totalCents, 0);
});

test("drops a flavor that no longer exists", () => {
  const t = priceOrder(shop, [{ slug: "not-a-flavor", format: "bag", qty: 3 }], none);
  assert.equal(t.itemCount, 0);
});

test("merges duplicate lines and clamps the quantity", () => {
  const clean = sanitizeCart(shop, [
    { slug: "maple-pecan", format: "bag", qty: 15 },
    { slug: "maple-pecan", format: "bag", qty: 15 },
  ]);
  assert.equal(clean.length, 1);
  assert.equal(clean[0].qty, MAX_QTY_PER_LINE);
});

test("blessing bags cost their own price and earn points", () => {
  const t = priceOrder(shop, [], { jarsReturned: 0, blessingBags: 2 });
  assert.equal(t.blessingCents, 1800);
  assert.equal(t.totalCents, 1800);
  assert.equal(t.points, 18);
});

test("a returned jar takes money off and adds points", () => {
  const t = priceOrder(shop, [{ slug: "maple-pecan", format: "jar", qty: 2 }], {
    jarsReturned: 3,
    blessingBags: 0,
  });
  assert.equal(t.subtotalCents, 2600);
  assert.equal(t.jarCreditRequestedCents, 600);
  assert.equal(t.jarCreditAppliedCents, 600);
  assert.equal(t.totalCents, 2000);
  assert.equal(t.points, 26 + 15);
});

test("the jar credit never drops an order below a dollar", () => {
  const t = priceOrder(shop, [{ slug: "honey-almond-crunch", format: "bag", qty: 1 }], {
    jarsReturned: 12,
    blessingBags: 0,
  });
  assert.equal(t.jarCreditRequestedCents, 2400);
  assert.equal(t.jarCreditAppliedCents, 800);
  assert.equal(t.totalCents, 100);
  // Jars the credit could not pay for still earn every one of their points.
  assert.equal(t.points, 9 + 60);
});

test("nonsense quantities never reach the till", () => {
  const t = priceOrder(shop, [{ slug: "maple-pecan", format: "bag", qty: Number.NaN }], {
    jarsReturned: -5,
    blessingBags: 999,
  });
  assert.equal(t.itemCount, 0);
  assert.equal(t.jarCreditRequestedCents, 0);
  assert.equal(t.blessingCents, 20 * 900);
});

test("money reads the way she would write it", () => {
  assert.equal(formatMoney(2000), "$20.00");
  assert.equal(formatMoney(100), "$1.00");
});

test("phone numbers are accepted however people type them", () => {
  assert.equal(normalisePhone("(623) 555-0134"), "+16235550134");
  assert.equal(normalisePhone("1 623 555 0134"), "+16235550134");
  assert.equal(normalisePhone(""), "");
});

const goodOrder = {
  lines: [{ slug: "maple-pecan", format: "bag", qty: 1 }],
  jarsReturned: 0,
  blessingBags: 0,
  details: {
    method: "delivery",
    runArea: shop.delivery.runs[0].area,
    runDate: shop.delivery.runs[0].nextDate,
    name: "Ruth Boaz",
    phone: "623-555-0134",
    address: "12 Olive Way",
    note: "",
    prayer: "",
  },
};

test("a complete order passes", () => {
  const result = validateOrder(shop, goodOrder);
  assert.equal(result.ok, true);
  assert.equal(result.totals.totalCents, 1000);
});

test("an empty basket is refused", () => {
  const result = validateOrder(shop, { ...goodOrder, lines: [] });
  assert.equal(result.ok, false);
  assert.ok(result.errors.lines);
});

test("delivery with nowhere to leave it is refused", () => {
  const result = validateOrder(shop, {
    ...goodOrder,
    details: { ...goodOrder.details, address: "" },
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.address);
});

test("a drop-off order uses the drop-off spot, not a home address", () => {
  const result = validateOrder(shop, {
    ...goodOrder,
    details: { ...goodOrder.details, method: "dropoff", address: "" },
  });
  assert.equal(result.ok, true);
  assert.equal(result.order.details.address, shop.delivery.dropOff);
});

test("a delivery day that does not exist is refused", () => {
  const result = validateOrder(shop, {
    ...goodOrder,
    details: { ...goodOrder.details, runArea: "Narnia", runDate: "Tue Sep 8" },
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.runIndex);
});

test("a run she has since removed is refused, not quietly swapped for another", () => {
  // The customer chose Vistancia. She deletes that run, so Anthem shifts into
  // its place. An order booked by position would land on the wrong porch.
  const withoutFirst = {
    ...shop,
    delivery: { ...shop.delivery, runs: shop.delivery.runs.slice(1) },
  };
  const result = validateOrder(withoutFirst, goodOrder);
  assert.equal(result.ok, false);
  assert.match(result.errors.runIndex, /not being offered/);
});

test("the run that was chosen is the run that is recorded", () => {
  const second = shop.delivery.runs[1];
  const result = validateOrder(shop, {
    ...goodOrder,
    details: { ...goodOrder.details, runArea: second.area, runDate: second.nextDate },
  });
  assert.equal(result.ok, true);
  assert.equal(result.order.details.runIndex, 1);
  assert.equal(orderMetadata(shop, result.order, result.totals).run_area, second.area);
});

test("a wild blessing-bag count is refused rather than billed", () => {
  const result = validateOrder(shop, { ...goodOrder, blessingBags: 100000 });
  assert.equal(result.ok, false);
  assert.ok(result.errors.blessingBags);
});

test("the quantities that were priced are the quantities that get charged", () => {
  const result = validateOrder(shop, { ...goodOrder, blessingBags: 3, jarsReturned: 2 });
  assert.equal(result.ok, true);
  // Whatever the browser sent, the order carries the clamped, priced figures.
  assert.equal(result.order.blessingBags, result.totals.blessingBags);
  assert.equal(result.order.jarsReturned, result.totals.jarsReturned);
  assert.equal(result.totals.blessingBags, 3);
});

test("the kitchen slip carries the items, the run and the points", () => {
  const result = validateOrder(shop, goodOrder);
  const meta = orderMetadata(shop, result.order, result.totals);
  assert.equal(meta.items, "1x Maple Pecan (bag)");
  assert.equal(meta.run_area, shop.delivery.runs[0].area);
  assert.equal(meta.points_earned, "10");
});
