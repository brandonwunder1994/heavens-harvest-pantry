import test from "node:test";
import assert from "node:assert/strict";
import { pickupDate, periodLabel, thanksgivingExtraBake, thanksgivingPhase } from "@/lib/fulfilment";
import { bakeFor } from "@/lib/owner-dashboard";

// Arizona is UTC-7 all year.
const az = (local) => Date.parse(`${local}-07:00`);

test("orders before Tuesday's cutoff still pick up this Friday, with Monday offered too", () => {
  assert.equal(pickupDate(az("2026-11-17T10:00:00")), "2026-11-20");
  assert.equal(thanksgivingExtraBake(az("2026-11-17T10:00:00")), "2026-11-23");
});

test("from Tuesday 9 p.m. to Saturday 9 p.m. every order picks up Monday or Tuesday", () => {
  for (const t of ["2026-11-17T21:00:00", "2026-11-19T12:00:00", "2026-11-21T20:59:00"]) {
    assert.equal(pickupDate(az(t)), "2026-11-23", t);
    assert.equal(thanksgivingExtraBake(az(t)), undefined, t);
  }
});

test("after Saturday 9 p.m. the skipped weekend rolls to December 4", () => {
  for (const t of ["2026-11-21T21:00:00", "2026-11-23T08:00:00", "2026-11-24T20:00:00", "2026-11-25T09:00:00"]) {
    assert.equal(pickupDate(az(t)), "2026-12-04", t);
  }
  assert.equal(pickupDate(az("2026-12-01T22:00:00")), "2026-12-11");
});

test("the notice moves through its phases and takes itself down", () => {
  assert.equal(thanksgivingPhase(az("2026-11-17T10:00:00")), "ordering");
  assert.equal(thanksgivingPhase(az("2026-11-22T08:00:00")), "closed");
  assert.equal(thanksgivingPhase(az("2026-11-25T00:00:00")), "over");
});

test("Thanksgiving afternoons read as night; ordinary ones keep from noon", () => {
  assert.equal(periodLabel("2026-11-23", "afternoon"), "Night");
  assert.equal(periodLabel("2026-11-24", "morning"), "Morning");
  assert.equal(periodLabel("2026-12-04", "afternoon"), "Afternoon, from noon");
});

test("a Tuesday pickup belongs to Monday's bake", () => {
  assert.equal(bakeFor({ runDate: "2026-11-24" }), "2026-11-23");
  assert.equal(bakeFor({ runDate: "2026-11-21" }), "2026-11-20");
});
