import { test } from "node:test";
import assert from "node:assert/strict";
import { flavorMarksFor, scanFlavorMarks } from "@/lib/flavor-marks";

test("Apple Maple Pecan reads left to right, three marks", () => {
  assert.deepEqual(flavorMarksFor({ name: "Apple Maple Pecan Granola- 1lb" }), [
    "apple",
    "maple",
    "pecan",
  ]);
});

test("the other bags on the menu get their own three marks", () => {
  assert.deepEqual(flavorMarksFor({ name: "Dark Chocolate Coconut Cashew Granola- 1 lb" }), [
    "chocolate",
    "coconut",
    "cashew",
  ]);
  assert.deepEqual(flavorMarksFor({ name: "Vanilla Blueberry Almond Granola- 1 lb" }), [
    "vanilla",
    "blueberry",
    "almond",
  ]);
  assert.deepEqual(flavorMarksFor({ name: "Candied Almonds-1 lb" }), ["candied", "almond"]);
});

test("a flavor she has not saved yet still gets marks from its name", () => {
  assert.deepEqual(flavorMarksFor({ name: "Pumpkin Walnut Cranberry" }), [
    "pumpkin",
    "walnut",
    "cranberry",
  ]);
});

test("coconut oil in the ingredients does not become a coconut on Apple Maple Pecan", () => {
  const marks = flavorMarksFor({
    name: "Apple Maple Pecan Granola",
    addIns: "pecans, maple, cinnamon",
  });
  assert.equal(marks.includes("coconut"), false);
  assert.deepEqual(marks, ["apple", "maple", "pecan"]);
});

test("pineapple is not an apple", () => {
  assert.deepEqual(scanFlavorMarks("Pineapple Coconut"), ["pineapple", "coconut"]);
});

test("pinned icons win, and never more than three", () => {
  assert.deepEqual(
    flavorMarksFor({
      name: "Apple Maple Pecan",
      icons: ["honey", "almond", "salt", "maple"],
    }),
    ["honey", "almond", "salt"],
  );
});
