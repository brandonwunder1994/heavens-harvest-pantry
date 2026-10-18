// Proves the "ready now" extras: the right weekend, a self-closing window, a stock count that
// cannot go below zero, and a cart that cannot be tricked into the wrong size or price.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { weekendFor, extrasAreOpen, cleanExtras, liveExtras, baseOfExtra, extraSlug } from "@/lib/extras.ts";
import { defaultShop } from "@/lib/content.ts";
import { priceOrder, sanitizeCart, orderWeight } from "@/lib/cart.ts";
import { validateOrder } from "@/lib/order.ts";
import { pickupDate, nextPickups, nextPickupsShort } from "@/lib/fulfilment.ts";

// 12:00 Arizona time is 19:00 UTC (Arizona does not observe daylight time).
const az = (iso) => Date.parse(`${iso}T19:00:00Z`);

test("the weekend is this Friday from Sunday to Friday, and the same Friday on Saturday", () => {
  assert.equal(weekendFor(az("2026-10-18")), "2026-10-23"); // Sunday
  assert.equal(weekendFor(az("2026-10-22")), "2026-10-23"); // Thursday night post
  assert.equal(weekendFor(az("2026-10-23")), "2026-10-23"); // Friday
  assert.equal(weekendFor(az("2026-10-24")), "2026-10-23"); // Saturday
  assert.equal(weekendFor(az("2026-10-25")), "2026-10-30"); // next Sunday
});

const setting = cleanExtras({ open: true, weekend: "2026-10-23", items: [{ slug: "maple-pecan", sizeOz: 8, qty: 2, price: 8, setAt: "2026-10-22T00:00:00Z" }] }, az("2026-10-22"));

test("extras close themselves at the end of Saturday", () => {
  assert.equal(extrasAreOpen(setting, az("2026-10-22")), true);
  assert.equal(extrasAreOpen(setting, az("2026-10-24")), true);
  assert.equal(extrasAreOpen(setting, az("2026-10-25")), false);
  assert.equal(extrasAreOpen({ ...setting, open: false }, az("2026-10-22")), false);
});

test("what is left is her total minus what has been claimed, never below zero", () => {
  const live = (claimed) => liveExtras(setting, defaultShop.flavors, new Map([[extraSlug("maple-pecan", 8), claimed]]), az("2026-10-22"));
  assert.equal(live(0).state.items[0].remaining, 2);
  assert.equal(live(1).flavors[0].soldOut, false);
  assert.equal(live(2).state.items[0].remaining, 0);
  assert.equal(live(2).flavors[0].soldOut, true);
  assert.equal(live(9).state.items[0].remaining, 0);
});

test("nonsense settings are refused, not trusted", () => {
  const bad = cleanExtras({ open: true, items: [{ slug: "x", sizeOz: 5, qty: 1, price: 5 }, { slug: "x", sizeOz: 8, qty: -1, price: 5 }, { slug: "x", sizeOz: 8, qty: 1, price: 0.01 }] });
  assert.equal(bad.items.length, 0);
});

test("an extra's name reads as ready now and its slug maps back to the flavor", () => {
  const live = liveExtras(setting, defaultShop.flavors, new Map(), az("2026-10-22"));
  assert.match(live.flavors[0].name, /ready now$/);
  assert.deepEqual(baseOfExtra("extra-maple-pecan-8"), { slug: "maple-pecan", sizeOz: 8 });
  assert.equal(baseOfExtra("maple-pecan"), null);
});

const shopWithExtras = () => {
  const live = liveExtras(setting, defaultShop.flavors, new Map(), az("2026-10-22"));
  return { ...defaultShop, extras: live.state, extraFlavors: live.flavors };
};
const line = (over = {}) => ({ slug: "extra-maple-pecan-8", format: "bag", sizeOz: 8, qty: 1, ...over });

test("an extra is priced at her extra price, not the regular one", () => {
  const totals = priceOrder(shopWithExtras(), [line()], { jarsReturned: 0, blessingBags: 0 });
  assert.equal(totals.subtotalCents, 800);
});

test("asking for a bigger size at the 8 oz price still gets the 8 oz bag", () => {
  const clean = sanitizeCart(shopWithExtras(), [line({ sizeOz: 16, format: "bag" })]);
  assert.equal(clean[0].sizeOz, 8);
  assert.equal(priceOrder(shopWithExtras(), [line({ sizeOz: 16 })], { jarsReturned: 0, blessingBags: 0 }).subtotalCents, 800);
});

test("an extra cannot be turned into a blessing gift", () => {
  const gift = { id: "g1", recipientName: "Sam Neighbor", address: "123 Main Street", inVistancia: true };
  const clean = sanitizeCart(shopWithExtras(), [line({ gift })]);
  assert.equal(clean[0].gift, undefined);
  const result = validateOrder(shopWithExtras(), { lines: [line({ gift })], details: { method: "dropoff", name: "Pat Buyer", phone: "6235550100", runDate: "2026-10-23", pickupPeriod: "morning" } });
  assert.equal(result.ok, false);
});

test("sold-out extras and made-up extras drop out of the cart", () => {
  const soldOut = liveExtras(setting, defaultShop.flavors, new Map([[extraSlug("maple-pecan", 8), 2]]), az("2026-10-22"));
  const shop = { ...defaultShop, extras: soldOut.state, extraFlavors: soldOut.flavors };
  assert.equal(sanitizeCart(shop, [line()]).length, 0);
  assert.equal(sanitizeCart(shopWithExtras(), [line({ slug: "extra-nothing-8" })]).length, 0);
  assert.equal(sanitizeCart(shopWithExtras(), [line({ slug: "extra-" })]).length, 0);
});

test("extras check out on their own, for this weekend", () => {
  const body = (lines, runDate) => ({ lines, details: { method: "dropoff", name: "Pat Buyer", phone: "6235550100", runDate, pickupPeriod: "morning" } });
  const ok = validateOrder(shopWithExtras(), body([line()], "2026-10-23"));
  assert.ok(ok.ok, JSON.stringify(ok.errors));
  assert.equal(ok.order.details.bakeId, "2026-10-23");
  const mixed = validateOrder(shopWithExtras(), body([line(), { slug: "maple-pecan", format: "bag", sizeOz: 8, qty: 1 }], "2026-10-23"));
  assert.equal(mixed.ok, false);
  assert.ok(mixed.errors.lines);
});

test("extras use almost no bake space, so they never fill the weekend's bake", () => {
  assert.equal(orderWeight([line({ qty: 3 })]), 3);
  assert.equal(orderWeight([{ slug: "maple-pecan", format: "bag", sizeOz: 8, qty: 3 }]), 24);
});

test("the pickup dates roll to the next Friday and Saturday every Tuesday night", () => {
  assert.equal(pickupDate(az("2026-10-17")), "2026-10-23"); // Saturday: this coming Friday
  assert.equal(pickupDate(Date.parse("2026-10-21T00:30:00Z")), "2026-10-23"); // Tuesday 5:30 pm Arizona: still this Friday
  assert.equal(pickupDate(Date.parse("2026-10-21T05:00:00Z")), "2026-10-30"); // Tuesday 10 pm Arizona: next Friday
  assert.equal(pickupDate(az("2026-10-22")), "2026-10-30"); // Thursday: closed for this week
  assert.equal(pickupDate(az("2026-10-26")), "2026-10-30"); // Monday
  assert.equal(nextPickups(az("2026-10-17")), "Friday, October 23, and Saturday, October 24");
  assert.equal(nextPickupsShort(az("2026-10-27")), "October 30 and 31");
  assert.equal(nextPickupsShort(az("2026-11-26")), "December 4 and 5");
});
