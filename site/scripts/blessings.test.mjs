// Proves the blessing map shows how many, and never where.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { fieldsFor, countedIn } from "@/lib/blessings.ts";

const NOW = new Date("2026-09-02T12:00:00Z").getTime();
const AREAS = ["Vistancia", "Anthem"];
const given = (id, area, bags, daysAgo = 0) => ({
  id,
  area,
  bags,
  at: NOW - daysAgo * 86_400_000,
});

test("no bags yet is an empty map, not a broken one", () => {
  const fields = fieldsFor([], AREAS, NOW);
  assert.equal(fields.length, 2);
  assert.deepEqual(fields.map((f) => f.area), AREAS);
  assert.equal(countedIn(fields), 0);
});

test("a round nobody has ordered from is still on the map", () => {
  const fields = fieldsFor([given("a", "Vistancia", 2)], AREAS, NOW);
  const anthem = fields.find((f) => f.area === "Anthem");
  assert.equal(anthem.bags, 0);
  assert.deepEqual(anthem.lights, []);
});

test("one bag is one light", () => {
  const fields = fieldsFor([given("a", "Vistancia", 1)], AREAS, NOW);
  assert.equal(fields[0].lights.length, 1);
  assert.equal(fields[0].bags, 1);
});

test("three bags on one order are three lights in three places", () => {
  const [vistancia] = fieldsFor([given("a", "Vistancia", 3)], AREAS, NOW);
  assert.equal(vistancia.lights.length, 3);
  const spots = new Set(vistancia.lights.map((l) => `${l.x},${l.y}`));
  assert.equal(spots.size, 3, "two bags must never land on the same spot");
});

test("the same order puts its lights in the same places every time", () => {
  const once = fieldsFor([given("pi_123", "Anthem", 4)], AREAS, NOW);
  const twice = fieldsFor([given("pi_123", "Anthem", 4)], AREAS, NOW);
  assert.deepEqual(once, twice);
});

test("and two different orders do not", () => {
  const [a] = fieldsFor([given("pi_1", "Vistancia", 1)], AREAS, NOW);
  const [b] = fieldsFor([given("pi_2", "Vistancia", 1)], AREAS, NOW);
  assert.notDeepEqual(a.lights[0], b.lights[0]);
});

test("every light is inside its area and none is dead centre", () => {
  const [vistancia] = fieldsFor(
    Array.from({ length: 40 }, (_, i) => given(`pi_${i}`, "Vistancia", 1)),
    AREAS,
    NOW,
  );
  for (const l of vistancia.lights) {
    const r = Math.hypot(l.x, l.y);
    assert.ok(r <= 1, `a light at ${r} is outside the area`);
    assert.ok(r > 0.15, `a light at ${r} is on top of the label`);
  }
});

test("an older bag is a fainter light, and nothing is older than a year", () => {
  const [v] = fieldsFor(
    [given("a", "Vistancia", 1, 0), given("b", "Vistancia", 1, 180), given("c", "Vistancia", 1, 900)],
    AREAS,
    NOW,
  );
  assert.equal(v.lights[0].age, 0);
  assert.ok(v.lights[1].age > 0.4 && v.lights[1].age < 0.6);
  assert.equal(v.lights[2].age, 1, "a bag from two years ago is as faint as one from one");
});

test("an area she does not deliver to is not invented", () => {
  const fields = fieldsFor([given("a", "Phoenix", 5)], AREAS, NOW);
  assert.equal(countedIn(fields), 0);
  assert.equal(fields.length, 2);
});

test("how she happened to type the area does not matter", () => {
  const fields = fieldsFor([given("a", " vistancia ", 2)], AREAS, NOW);
  assert.equal(countedIn(fields), 2);
});

test("nothing that is not a number of bags becomes one", () => {
  const fields = fieldsFor(
    [given("a", "Anthem", 0), given("b", "Anthem", -3), given("c", "Anthem", Number.NaN)],
    AREAS,
    NOW,
  );
  assert.equal(countedIn(fields), 0);
});

test("an order of a hundred bags does not draw a hundred dots", () => {
  const [v] = fieldsFor([given("a", "Vistancia", 100)], AREAS, NOW);
  assert.equal(v.bags, 100, "it is still counted honestly");
  assert.ok(v.lights.length <= 24, "but the map stays a map");
});
