// Proves the jar shows the flavor you are looking at, whatever she calls it.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { materialFor, PLAIN } from "@/lib/material.ts";

const flavor = (name, blurb = "", ingredients = "") => ({ name, blurb, ingredients });

test("dark chocolate is dark and dull", () => {
  const m = materialFor(flavor("Dark Chocolate Sea Salt", "Deep and not too sweet.", "Oats, cacao, sea salt"));
  assert.equal(m.key, "chocolate");
  assert.ok(m.roughness > 0.8, `roughness ${m.roughness}`);
  assert.ok(m.gloss < 0.5, `gloss ${m.gloss}`);
});

test("and the salt in it catches the light", () => {
  const salted = materialFor(flavor("Dark Chocolate Sea Salt", "", "cacao, sea salt"));
  const plainChoc = materialFor(flavor("Dark Chocolate", "", "cacao"));
  assert.ok(salted.sparkle > plainChoc.sparkle);
  assert.equal(plainChoc.sparkle, 0);
});

test("honey almond is glossy and amber", () => {
  const m = materialFor(flavor("Honey Almond Crunch", "Local honey, toasted almonds.", "Oats, honey, almonds"));
  assert.equal(m.key, "honey");
  assert.equal(m.gloss, 1);
  assert.ok(m.roughness < 0.8);
});

test("maple pecan is its own thing, not honey", () => {
  assert.equal(materialFor(flavor("Maple Pecan", "", "Oats, maple syrup, pecans")).key, "maple");
});

test("cinnamon apple is warm and reddish", () => {
  assert.equal(materialFor(flavor("Cinnamon Apple", "", "Oats, cinnamon, dried apple")).key, "cinnamon");
});

test("chocolate wins over the nuts it is mixed with", () => {
  // A chocolate almond granola looks like chocolate, not like almonds.
  assert.equal(materialFor(flavor("Chocolate Almond", "", "cacao nibs, almonds, honey")).key, "chocolate");
});

test("a flavor described in words it has never heard of is honey oats", () => {
  const m = materialFor(flavor("Saturday Morning", "The one she makes for her boys.", "Oats, olive oil"));
  assert.equal(m.key, PLAIN.key);
  assert.deepEqual(m.palette, PLAIN.palette);
});

test("it reads the ingredients, not only the name", () => {
  assert.equal(materialFor(flavor("Sunday Best", "", "Oats, cocoa, honey")).key, "chocolate");
});

test("an empty flavor is still a jar of granola", () => {
  const m = materialFor(flavor("", "", ""));
  assert.equal(m.key, PLAIN.key);
  assert.equal(m.palette.length, 5);
});

test("every look ships five shades and sane numbers", () => {
  const names = [
    ["Dark Chocolate Sea Salt", "cacao"],
    ["Maple Pecan", "maple"],
    ["Honey Almond", "honey"],
    ["Cinnamon Apple", "cinnamon"],
    ["Cranberry Orange", "cranberry"],
    ["Coconut Cashew", "coconut"],
    ["Plain Oats", "oats"],
  ];
  for (const [name, ing] of names) {
    const m = materialFor(flavor(name, "", ing));
    assert.equal(m.palette.length, 5, name);
    for (const shade of m.palette) assert.match(shade, /^#[0-9a-f]{6}$/i, `${name} ${shade}`);
    assert.ok(m.roughness > 0.3 && m.roughness <= 1, `${name} roughness ${m.roughness}`);
    assert.ok(m.gloss >= 0 && m.gloss <= 1, `${name} gloss ${m.gloss}`);
    assert.ok(m.sparkle >= 0 && m.sparkle <= 1, `${name} sparkle ${m.sparkle}`);
  }
});

test("reading the same flavor twice gives the same jar", () => {
  const f = flavor("Dark Chocolate Sea Salt", "Deep.", "cacao, sea salt");
  assert.deepEqual(materialFor(f), materialFor(f));
});
