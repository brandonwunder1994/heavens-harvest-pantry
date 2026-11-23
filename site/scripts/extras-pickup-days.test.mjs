// Proves extras pickup days she picks herself: a Thanksgiving week can run Monday to
// Wednesday with only the half-days she is home, and checkout only takes those.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanExtras, liveExtras, extrasAreOpen, extrasPickups, extrasStillRunning, extraPickupChoices, extraSlug } from "@/lib/extras.ts";
import { defaultShop } from "@/lib/content.ts";
import { validateOrder } from "@/lib/order.ts";
import { confirmationCopy } from "@/lib/order-confirmation.ts";

const az = (iso) => Date.parse(`${iso}T19:00:00Z`); // noon in Arizona
const monday = az("2026-11-23");
const item = { slug: "maple-pecan", sizeOz: 8, qty: 3, price: 8, setAt: "2026-11-23T18:00:00Z" };
const thanksgivingWeek = cleanExtras({
  open: true, weekend: "2026-11-27", items: [item],
  pickups: [
    { date: "2026-11-25", morning: true, afternoon: false },
    { date: "2026-11-23", morning: false, afternoon: true },
    { date: "2026-11-24", morning: true, afternoon: true },
    { date: "2026-11-26", morning: false, afternoon: false }, // ticked then unticked: dropped
    { date: "nonsense", morning: true, afternoon: true },
  ],
}, monday);

test("the owner page offers today and the next six days", () => {
  assert.deepEqual(extraPickupChoices(monday), ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"]);
});

test("only real, ticked days are kept, in date order", () => {
  assert.deepEqual(thanksgivingWeek.pickups.map(p => p.date), ["2026-11-23", "2026-11-24", "2026-11-25"]);
});

test("extras close after the last day she picked, not on Saturday", () => {
  assert.equal(extrasAreOpen(thanksgivingWeek, az("2026-11-25")), true);
  assert.equal(extrasAreOpen(thanksgivingWeek, az("2026-11-26")), false);
  const pastSaturday = cleanExtras({ ...thanksgivingWeek, weekend: "2026-11-20", pickups: [{ date: "2026-11-23", morning: true, afternoon: false }] }, az("2026-11-21"));
  assert.equal(extrasAreOpen(pastSaturday, az("2026-11-23")), true);
  assert.equal(extrasStillRunning(pastSaturday, az("2026-11-22")), true, "a Sunday re-save keeps the counts");
});

test("days that have passed drop off what customers see", () => {
  assert.deepEqual(extrasPickups(thanksgivingWeek, az("2026-11-24")).map(p => p.date), ["2026-11-24", "2026-11-25"]);
});

test("a list saved before pickup days existed still uses today through Saturday", () => {
  const old = cleanExtras({ open: true, weekend: "2026-10-23", items: [item] }, az("2026-10-21"));
  assert.deepEqual(extrasPickups(old, az("2026-10-21")).map(p => p.date), ["2026-10-21", "2026-10-23", "2026-10-24"]);
});

const shop = (now = monday) => {
  const live = liveExtras(thanksgivingWeek, defaultShop.flavors, new Map([[extraSlug("maple-pecan", 8), 0]]), now);
  return { ...defaultShop, extras: live.state, extraFlavors: live.flavors };
};
const order = (runDate, pickupPeriod) => ({ lines: [{ slug: "extra-maple-pecan-8", format: "bag", sizeOz: 8, qty: 1 }], details: { method: "dropoff", name: "Pat Buyer", phone: "6235550100", runDate, pickupPeriod } });

test("checkout takes only the days and half-days she offered", () => {
  assert.ok(validateOrder(shop(), order("2026-11-23", "afternoon")).ok);
  assert.ok(validateOrder(shop(), order("2026-11-24", "morning")).ok);
  assert.ok(validateOrder(shop(), order("2026-11-25", "morning")).ok);
  assert.equal(validateOrder(shop(), order("2026-11-23", "morning")).ok, false, "Monday morning was not offered");
  assert.equal(validateOrder(shop(), order("2026-11-25", "afternoon")).ok, false, "Wednesday afternoon was not offered");
  assert.equal(validateOrder(shop(), order("2026-11-27", "morning")).ok, false, "the skipped Friday is not offered");
});

test("the confirmation email names the exact day and half-day she offered", () => {
  const result = validateOrder(shop(), order("2026-11-25", "morning"));
  const copy = confirmationCopy({ order: result.order, totals: result.totals }, { address: "1 Porch Lane\nPeoria, AZ", contact: "" }, 800, 0);
  assert.match(copy.text, /Porch pickup: Wednesday, November 25, morning\./);
  assert.match(copy.html, /Wednesday, November 25/);
});
