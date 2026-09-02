// Unit tests for the owner's page arithmetic. Run: npm test
// Written in JavaScript so Node runs it directly and strips the types off the
// TypeScript module it imports, with no build step and no test framework.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bakeList,
  formatCents,
  formatCentsExact,
  jarsIn,
  parseItems,
  runSheet,
  summarise,
  toOrder,
  unitsIn,
} from "../lib/orders.ts";

const DAY = 86_400;
const NOON_TODAY = Math.floor(new Date().setHours(12, 0, 0, 0) / 1000);

function session(overrides = {}, meta = {}) {
  return {
    id: "cs_test_1",
    created: NOON_TODAY,
    amount_total: 1900,
    payment_status: "paid",
    payment_intent: "pi_1",
    metadata: {
      customer_name: "Sarah M.",
      phone: "+16235550199",
      method: "delivery",
      run_area: "Vistancia",
      run_date: "Tue Sep 8",
      address: "12844 W Example Dr",
      porch_note: "Gate code 1234",
      prayer_request: "A hard week.",
      jars_returned: "2",
      blessing_bags: "1",
      points_earned: "42",
      items: "1x Maple Pecan (bag); 2x Dark Chocolate Sea Salt (jar)",
      ...meta,
    },
    ...overrides,
  };
}

const order = (over = {}, meta = {}) => toOrder(session(over, meta));

test("parses the item list written into Stripe metadata", () => {
  assert.deepEqual(parseItems("1x Maple Pecan (bag); 2x Dark Chocolate Sea Salt (jar)"), [
    { qty: 1, name: "Maple Pecan", format: "bag" },
    { qty: 2, name: "Dark Chocolate Sea Salt", format: "jar" },
  ]);
});

test("ignores empty or malformed item text instead of throwing", () => {
  assert.deepEqual(parseItems(""), []);
  assert.deepEqual(parseItems("nonsense"), []);
  assert.deepEqual(parseItems("2x Honey Almond Crunch (jar); junk"), [
    { qty: 2, name: "Honey Almond Crunch", format: "jar" },
  ]);
});

test("maps a paid Stripe session onto an order", () => {
  const o = order();
  assert.equal(o.name, "Sarah M.");
  assert.equal(o.amountCents, 1900);
  assert.equal(o.jarsReturned, 2);
  assert.equal(o.blessingBags, 1);
  assert.equal(o.method, "delivery");
  assert.equal(o.delivered, false);
  assert.equal(o.paymentIntentId, "pi_1");
  assert.equal(unitsIn(o), 3);
  assert.equal(jarsIn(o), 2);
});

test("survives a session with no metadata at all", () => {
  const o = toOrder({ id: "cs_x", created: 1, amount_total: null, metadata: null });
  assert.equal(o.amountCents, 0);
  assert.equal(o.jarsReturned, 0);
  assert.deepEqual(o.items, []);
  assert.equal(o.paymentIntentId, null);
});

test("reads the delivered flag written back after a drop-off", () => {
  assert.equal(order({}, { delivered: "yes" }).delivered, true);
  assert.equal(order({}, { delivered: "no" }).delivered, false);
});

test("counts today, this week and the week before", () => {
  const orders = [
    order({ id: "a", created: NOON_TODAY, amount_total: 1900 }),
    order({ id: "b", created: NOON_TODAY - 3 * DAY, amount_total: 1000 }),
    order({ id: "c", created: NOON_TODAY - 10 * DAY, amount_total: 2000 }),
  ];
  const s = summarise(orders, NOON_TODAY, "Tue Sep 8");
  assert.equal(s.todayCents, 1900);
  assert.equal(s.todayCount, 1);
  assert.equal(s.weekCents, 2900, "today plus three days ago");
  assert.equal(s.previousWeekCents, 2000);
});

test("jars out is every jar sold minus every jar handed back", () => {
  const orders = [
    order({ id: "a" }, { items: "3x Maple Pecan (jar)", jars_returned: "1" }),
    order({ id: "b" }, { items: "2x Maple Pecan (jar); 1x Maple Pecan (bag)", jars_returned: "0" }),
  ];
  assert.equal(summarise(orders, NOON_TODAY, "Tue Sep 8").jarsOut, 4);
});

test("jars out never goes negative when more come back than went out", () => {
  const orders = [order({ id: "a" }, { items: "1x Maple Pecan (jar)", jars_returned: "6" })];
  assert.equal(summarise(orders, NOON_TODAY, "Tue Sep 8").jarsOut, 0);
});

test("only undelivered stops on this run count as jars due back", () => {
  const orders = [
    order({ id: "a" }, { jars_returned: "2", run_date: "Tue Sep 8" }),
    order({ id: "b" }, { jars_returned: "3", run_date: "Tue Sep 8", delivered: "yes" }),
    order({ id: "c" }, { jars_returned: "4", run_date: "Fri Sep 11" }),
  ];
  assert.equal(summarise(orders, NOON_TODAY, "Tue Sep 8").jarsDueBack, 2);
});

test("repeat rate counts people, not orders", () => {
  const orders = [
    order({ id: "a" }, { phone: "+1111" }),
    order({ id: "b" }, { phone: "+1111" }),
    order({ id: "c" }, { phone: "+2222" }),
    order({ id: "d" }, { phone: "+3333" }),
  ];
  assert.equal(summarise(orders, NOON_TODAY, "Tue Sep 8").repeatRate, 33);
});

test("repeat rate is zero rather than NaN with no customers", () => {
  assert.equal(summarise([], NOON_TODAY, "Tue Sep 8").repeatRate, 0);
});

test("bake list totals one run only, biggest first", () => {
  const orders = [
    order({ id: "a" }, { run_date: "Tue Sep 8", items: "2x Maple Pecan (jar)" }),
    order({ id: "b" }, { run_date: "Tue Sep 8", items: "1x Maple Pecan (bag); 4x Honey Almond Crunch (bag)" }),
    order({ id: "c" }, { run_date: "Fri Sep 11", items: "9x Cinnamon Apple (jar)" }),
  ];
  const rows = bakeList(orders, "Tue Sep 8");
  assert.deepEqual(rows, [
    { name: "Honey Almond Crunch", jars: 0, bags: 4, total: 4 },
    { name: "Maple Pecan", jars: 2, bags: 1, total: 3 },
  ]);
  assert.equal(bakeList(orders, "Fri Sep 11")[0].jars, 9);
});

test("run sheet puts undelivered porches first and finished stops last", () => {
  const orders = [
    order({ id: "done", created: 100 }, { delivered: "yes" }),
    order({ id: "drop", created: 200 }, { method: "dropoff" }),
    order({ id: "porch-late", created: 300 }),
    order({ id: "porch-early", created: 150 }),
    order({ id: "other-run", created: 400 }, { run_date: "Fri Sep 11" }),
  ];
  assert.deepEqual(
    runSheet(orders, "Tue Sep 8").map((o) => o.id),
    ["porch-early", "porch-late", "drop", "done"],
  );
});

test("money is formatted the way she would write it", () => {
  assert.equal(formatCents(121_400), "$1,214");
  assert.equal(formatCents(0), "$0");
  assert.equal(formatCentsExact(1900), "$19.00");
  assert.equal(formatCentsExact(5), "$0.05");
});
