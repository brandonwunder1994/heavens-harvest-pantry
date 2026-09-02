// Unit tests for the one-tap reorder. Run: npm test
//
// This link puts things in somebody's basket without them choosing each one, so
// the rule that matters is that it can only ever add something she is actually
// selling this week.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readReorder, reorderLink, reorderNote } from "../lib/reorder.ts";

const flavors = [
  { slug: "honey-almond-crunch", name: "Honey Almond Crunch", bagPrice: 9, jarPrice: 12 },
  { slug: "maple-pecan", name: "Maple Pecan", bagPrice: 10, jarPrice: 13 },
  { slug: "cinnamon-apple", name: "Cinnamon Apple", bagPrice: 9, jarPrice: 12, soldOut: true },
];

const item = (name, format, qty) => ({ name, format, qty });

test("a past order becomes a link the menu can read", () => {
  const link = reorderLink([item("Maple Pecan", "bag", 2)], flavors);
  assert.equal(link, "/menu?again=maple-pecan%3Abag%3A2");
});

test("the link survives the round trip", () => {
  const link = reorderLink([item("Maple Pecan", "bag", 2), item("Honey Almond Crunch", "jar", 1)], flavors);
  const again = decodeURIComponent(link.split("again=")[1]);
  assert.deepEqual(readReorder(again, flavors), [
    { slug: "maple-pecan", format: "bag", qty: 2 },
    { slug: "honey-almond-crunch", format: "jar", qty: 1 },
  ]);
});

test("a flavor she has sold out is left out of the link", () => {
  const link = reorderLink([item("Cinnamon Apple", "bag", 1)], flavors);
  assert.equal(link, null);
});

test("a flavor she has renamed since is left out of the link", () => {
  const link = reorderLink([item("Pumpkin Spice", "bag", 1), item("Maple Pecan", "bag", 1)], flavors);
  assert.equal(decodeURIComponent(link.split("again=")[1]), "maple-pecan:bag:1");
});

test("names are matched however they were capitalised", () => {
  const link = reorderLink([item("  maple PECAN ", "bag", 1)], flavors);
  assert.ok(link.includes("maple-pecan"));
});

// ------------------------------------------------- what arrives from the address

test("a made-up slug in the address adds nothing", () => {
  assert.deepEqual(readReorder("not-a-flavor:bag:2", flavors), []);
});

test("a sold-out flavor in the address adds nothing", () => {
  assert.deepEqual(readReorder("cinnamon-apple:bag:2", flavors), []);
});

test("a made-up format adds nothing", () => {
  assert.deepEqual(readReorder("maple-pecan:crate:2", flavors), []);
});

test("a silly quantity is clamped rather than obeyed", () => {
  assert.deepEqual(readReorder("maple-pecan:bag:9999", flavors), [
    { slug: "maple-pecan", format: "bag", qty: 20 },
  ]);
  assert.deepEqual(readReorder("maple-pecan:bag:0", flavors), []);
  assert.deepEqual(readReorder("maple-pecan:bag:-3", flavors), []);
  assert.deepEqual(readReorder("maple-pecan:bag:two", flavors), []);
});

test("the same line twice is only added once", () => {
  assert.deepEqual(readReorder("maple-pecan:bag:1,maple-pecan:bag:5", flavors), [
    { slug: "maple-pecan", format: "bag", qty: 1 },
  ]);
});

test("rubbish is dropped rather than throwing", () => {
  for (const junk of [null, undefined, "", ",,,", ":::", "a:b"]) {
    assert.deepEqual(readReorder(junk, flavors), []);
  }
});

test("a very long address cannot fill a basket", () => {
  const many = Array.from({ length: 50 }, (_, i) => `maple-pecan:bag:${(i % 9) + 1}`).join(",");
  assert.ok(readReorder(many, flavors).length <= 12);
});

// ------------------------------------------------------------ what they are told

test("they are always told what was put in the basket", () => {
  assert.match(reorderNote(1, 1), /back in your basket/i);
  assert.match(reorderNote(3, 3), /Those are back/i);
  assert.match(reorderNote(3, 1), /The rest is not on the menu/i);
  assert.match(reorderNote(2, 0), /Nothing from that order/i);
});
