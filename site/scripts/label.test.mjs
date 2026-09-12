import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultNetWeight,
  flavorInitials,
  formatPackedDate,
  mmdd,
  pngFilename,
  templateFor,
  trackerFrom,
  upsertTemplate,
} from "../lib/label.ts";
import { defaultLabelSettings, flavors } from "../lib/content.ts";

test("Honey Almond Crunch initials are HA, Maple Pecan is MP", () => {
  assert.equal(flavorInitials("Honey Almond Crunch"), "HA");
  assert.equal(flavorInitials("Maple Pecan"), "MP");
  assert.equal(flavorInitials("Dark Chocolate Sea Salt"), "DC");
  assert.equal(flavorInitials("Cinnamon Apple"), "CA");
});

test("a tracker code is a name, the flavor, and the packed date — never a Stripe id", () => {
  assert.equal(trackerFrom("Jane Doe", "Honey Almond Crunch", "2026-09-12"), "JANE-HA-0912");
  assert.equal(trackerFrom("", "Maple Pecan", "2026-09-12"), "ORDER-MP-0912");
});

test("the download name is safe for a phone photos folder", () => {
  assert.equal(
    pngFilename("honey-almond-crunch", "2026-09-12", "JANE-HA-0912"),
    "hhp-honey-almond-crunch-0912-jane-ha-0912.png",
  );
});

test("packed dates stay on the calendar day she typed", () => {
  assert.equal(formatPackedDate("2026-09-12"), "Sep 12, 2026");
  assert.equal(mmdd("2026-09-12"), "0912");
});

test("a bag and a jar have different net weights", () => {
  assert.match(defaultNetWeight("bag"), /12 oz/);
  assert.match(defaultNetWeight("jar"), /16 oz/);
});

test("an unsaved flavor gets the menu copy and Philippians 4:4", () => {
  const flavor = flavors[0];
  const draft = templateFor(defaultLabelSettings, flavor);
  assert.equal(draft.title, flavor.name);
  assert.equal(draft.ingredients, flavor.ingredients);
  assert.equal(draft.scripture.reference, "Philippians 4 : 4");
});

test("saving a flavor's label keeps the others", () => {
  const first = templateFor(defaultLabelSettings, flavors[0]);
  const next = upsertTemplate(defaultLabelSettings, { ...first, ingredients: "Oats only." });
  const maple = templateFor(next, flavors[1]);
  const both = upsertTemplate(next, maple);
  assert.equal(both.templates.length, 2);
  assert.equal(both.templates.find((row) => row.flavorSlug === flavors[0].slug)?.ingredients, "Oats only.");
});
