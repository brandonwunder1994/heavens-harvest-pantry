// Proves a hand edit moves the pickup inside its own bake, keeps a log, and never touches what was bought.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { editSnapshot } from "@/lib/order-edit.ts";

const snapshot = () => ({
  order: {
    lines: [{ slug: "maple-pecan", format: "bag", sizeOz: 8, qty: 1 }],
    jarsReturned: 0,
    blessingBags: 0,
    details: { method: "dropoff", runIndex: 0, runArea: "Porch pickup", runDate: "2026-10-23", bakeId: "2026-10-23", pickupPeriod: "morning", name: "Sample", phone: "6235550100", address: "Vistancia", note: "", prayer: "" },
  },
  totals: { totalCents: 1000, lines: [] },
});

test("moves the pickup to the bake's Saturday afternoon and logs it", () => {
  const r = editSnapshot(snapshot(), { runDate: "2026-10-24", pickupPeriod: "afternoon" }, Date.parse("2026-10-20T12:00:00Z"));
  assert.ok(r.ok && r.changed);
  assert.equal(r.snapshot.order.details.runDate, "2026-10-24");
  assert.equal(r.snapshot.order.details.pickupPeriod, "afternoon");
  assert.equal(r.snapshot.order.details.bakeId, "2026-10-23");
  assert.match(r.snapshot.order.details.ownerLog[0], /Friday morning to Saturday afternoon/);
});

test("refuses a day outside that bake", () => {
  const r = editSnapshot(snapshot(), { runDate: "2026-10-30", pickupPeriod: "morning" });
  assert.equal(r.ok, false);
});

test("refuses a made-up half-day", () => {
  assert.equal(editSnapshot(snapshot(), { pickupPeriod: "midnight" }).ok, false);
});

test("a note alone changes nothing else", () => {
  const before = snapshot();
  const r = editSnapshot(before, { ownerNote: "  Texted: will come at 4  " });
  assert.ok(r.ok && r.changed);
  assert.equal(r.snapshot.order.details.ownerNote, "Texted: will come at 4");
  assert.equal(r.snapshot.order.details.runDate, "2026-10-23");
  assert.deepEqual(r.snapshot.order.lines, before.order.lines);
  assert.equal(r.snapshot.totals.totalCents, 1000);
});

test("saving the same thing again is not a change", () => {
  const r = editSnapshot(snapshot(), { runDate: "2026-10-23", pickupPeriod: "morning", ownerNote: "" });
  assert.ok(r.ok);
  assert.equal(r.changed, false);
});

test("a gifts-only order has no pickup to move", () => {
  const s = snapshot();
  s.order.lines = [{ slug: "maple-pecan", format: "bag", sizeOz: 8, qty: 1, gift: { id: "g" } }];
  assert.equal(editSnapshot(s, { runDate: "2026-10-24", pickupPeriod: "morning" }).ok, false);
});
