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
import { pickupDate } from "../lib/fulfilment.ts";

// Freeze the old catalog to verify legacy cart arithmetic independently of the live menu.
const shop = {...defaultShop, flavors:[
 {...defaultShop.flavors[0],slug:'honey-almond-crunch',name:'Honey Almond Crunch',bagPrice:9,jarPrice:12,samplerPrice:5},
 {...defaultShop.flavors[0],name:'Maple Pecan',bagPrice:10,jarPrice:13,samplerPrice:5},
 {...defaultShop.flavors[3],soldOut:true}
]};
const none = { jarsReturned: 0, blessingBags: 0 };

test("prices bags at the bag price", () => {
  const t = priceOrder(shop, [{ slug: "honey-almond-crunch", format: "bag", qty: 2 }], none);
  assert.equal(t.subtotalCents, 1800);
  assert.equal(t.totalCents, 1800);
  assert.equal(t.itemCount, 2);
});

test("prices the 3 oz sampler as its own bag format", () => {
  const t = priceOrder(shop, [{ slug: "honey-almond-crunch", format: "sampler", qty: 1 }], none);
  assert.equal(t.totalCents, 500);
  assert.equal(t.lines[0].line.format, "sampler");
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
  assert.equal(t.blessingCents, 1400);
  assert.equal(t.totalCents, 1400);
  assert.equal(t.points, 0);
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
  assert.equal(t.points, 0);
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
  assert.equal(t.points, 0);
});

test("nonsense quantities never reach the till", () => {
  const t = priceOrder(shop, [{ slug: "maple-pecan", format: "bag", qty: Number.NaN }], {
    jarsReturned: -5,
    blessingBags: 999,
  });
  assert.equal(t.itemCount, 0);
  assert.equal(t.jarCreditRequestedCents, 0);
  assert.equal(t.blessingCents, 20 * 700);
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
    method: "dropoff",
    runArea: "Porch pickup",
    runDate: pickupDate(),
    pickupPeriod: "morning",
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

test("delivery is paused even when an address is supplied", () => {
  const result = validateOrder(shop, {
    ...goodOrder,
    details: { ...goodOrder.details, method: "delivery" },
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.method, /paused/);
});

test("a drop-off order uses the drop-off spot, not a home address", () => {
  const result = validateOrder(shop, {
    ...goodOrder,
    details: { ...goodOrder.details, method: "dropoff", address: "" },
  });
  assert.equal(result.ok, true);
  assert.equal(result.order.details.address, "Vistancia");
});

test("an old pickup date is rejected instead of silently moved", () => {
  const result = validateOrder(shop, {
    ...goodOrder,
    details: { ...goodOrder.details, runArea: "Narnia", runDate: "Tue Sep 8" },
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.runDate);
});

test("pickup still works if an old delivery run is removed", () => {
  // The customer chose Vistancia. She deletes that run, so Anthem shifts into
  // its place. An order booked by position would land on the wrong porch.
  const withoutFirst = {
    ...shop,
    delivery: { ...shop.delivery, runs: shop.delivery.runs.slice(1) },
  };
  const result = validateOrder(withoutFirst, goodOrder);
  assert.equal(result.ok, true);
  assert.equal(result.order.details.runArea, "Porch pickup");
});

test("a pickup order records pickup instead of a delivery run", () => {
  const second = shop.delivery.runs[1];
  const result = validateOrder(shop, {
    ...goodOrder,
    details: { ...goodOrder.details, runArea: second.area, runDate: pickupDate() },
  });
  assert.equal(result.ok, true);
  assert.equal(result.order.details.runArea, "Porch pickup");
  assert.equal(orderMetadata(shop, result.order, result.totals).run_area, "Porch pickup");
});

test("a wild blessing-bag count is refused rather than billed", () => {
  const result = validateOrder(shop, { ...goodOrder, blessingBags: 100000 });
  assert.equal(result.ok, false);
  assert.ok(result.errors.blessingBags);
});

test("the quantities that were priced are the quantities that get charged", () => {
  const result = validateOrder(shop, { ...goodOrder, jarsReturned: 0 });
  assert.equal(result.ok, true);
  // Whatever the browser sent, the order carries the clamped, priced figures.
  assert.equal(result.order.blessingBags, result.totals.blessingBags);
  assert.equal(result.order.jarsReturned, result.totals.jarsReturned);
  assert.equal(result.totals.blessingBags, 0);
});

test("legacy flat-price blessing purchases require a recipient selection", () => {
  const result = validateOrder(shop, { ...goodOrder, blessingBags: 1 });
  assert.equal(result.ok, false);
  assert.ok(result.errors.blessingBags);
});

test("the kitchen slip carries the items, pickup and the points", () => {
  const result = validateOrder(shop, goodOrder);
  const meta = orderMetadata(shop, result.order, result.totals);
  assert.equal(meta.items, "1x Maple Pecan (bag)");
  assert.equal(meta.run_area, "Porch pickup");
  assert.equal(meta.points_earned, "0");
});
