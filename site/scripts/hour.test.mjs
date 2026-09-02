// Proves the light follows the visitor's clock and never lands between two
// settings.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { hourFor, isHour, HOURS } from "@/lib/hour.ts";

test("the four named hours are the only answers, right round the clock", () => {
  for (let h = 0; h < 24; h++) {
    assert.ok(HOURS.includes(hourFor(h)), `${h}:00 gave ${hourFor(h)}`);
  }
});

test("she is baking in low gold", () => {
  assert.equal(hourFor(5), "dawn");
  assert.equal(hourFor(6), "dawn");
  assert.equal(hourFor(9), "dawn");
});

test("the middle of the day is overhead", () => {
  assert.equal(hourFor(10), "noon");
  assert.equal(hourFor(12), "noon");
  assert.equal(hourFor(15), "noon");
});

test("late afternoon comes in sideways and amber", () => {
  assert.equal(hourFor(16), "evening");
  assert.equal(hourFor(19), "evening");
});

test("after eight there is one warm bulb, and it is still on at four", () => {
  assert.equal(hourFor(20), "night");
  assert.equal(hourFor(23), "night");
  assert.equal(hourFor(0), "night");
  assert.equal(hourFor(4), "night");
});

test("a real date is read in the visitor's own time, not UTC", () => {
  const morning = new Date(2026, 8, 2, 7, 30);
  const evening = new Date(2026, 8, 2, 18, 5);
  assert.equal(hourFor(morning), "dawn");
  assert.equal(hourFor(evening), "evening");
});

test("a clock that makes no sense still lights the room", () => {
  assert.equal(hourFor(Number.NaN), "dawn");
  assert.equal(hourFor(new Date("nonsense")), "dawn");
});

test("an hour outside the day wraps rather than falling through", () => {
  assert.equal(hourFor(26), "night");
  assert.equal(hourFor(-1), "night");
  assert.equal(hourFor(30), "dawn");
});

test("a URL cannot ask for a fifth kind of light", () => {
  assert.equal(isHour("dawn"), true);
  assert.equal(isHour("night"), true);
  assert.equal(isHour("midnight"), false);
  assert.equal(isHour(""), false);
  assert.equal(isHour(null), false);
});
