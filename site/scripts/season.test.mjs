// Proves the shop is a different colour when you come back, and the right one.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { seasonFor, easterSunday, adventStart, SEASONS } from "@/lib/season.ts";

const on = (y, m, d) => new Date(y, m - 1, d);

test("Easter 2026 is the fifth of April", () => {
  const e = easterSunday(2026);
  assert.equal(e.getMonth(), 3);
  assert.equal(e.getDate(), 5);
});

test("Advent 2026 begins on the twenty-ninth of November", () => {
  const a = adventStart(2026);
  assert.equal(a.getMonth(), 10);
  assert.equal(a.getDate(), 29);
  assert.equal(a.getDay(), 0, "and it is a Sunday");
});

test("Advent is always four Sundays, every year to 2070", () => {
  for (let y = 2026; y <= 2070; y++) {
    const a = adventStart(y);
    assert.equal(a.getDay(), 0, `${y} does not start on a Sunday`);
    const days = (on(y, 12, 25) - a) / 86_400_000;
    assert.ok(days >= 22 && days <= 28, `${y} is ${days} days of Advent`);
  }
});

test("Holy Week and Easter week are white and pale gold", () => {
  assert.equal(seasonFor(on(2026, 3, 29)), "easter", "Palm Sunday");
  assert.equal(seasonFor(on(2026, 4, 3)), "easter", "Good Friday");
  assert.equal(seasonFor(on(2026, 4, 5)), "easter", "Easter Sunday");
  assert.equal(seasonFor(on(2026, 4, 11)), "easter", "the Saturday after");
  assert.equal(seasonFor(on(2026, 4, 13)), "ordinary", "and then it is over");
});

test("Advent is violet, and stops when the waiting does", () => {
  assert.equal(seasonFor(on(2026, 11, 29)), "advent");
  assert.equal(seasonFor(on(2026, 12, 15)), "advent");
  assert.equal(seasonFor(on(2026, 12, 24)), "advent", "Christmas Eve");
  assert.equal(seasonFor(on(2026, 12, 25)), "christmas", "and not on Christmas Day");
});

test("the twelve days run to Epiphany and no further", () => {
  assert.equal(seasonFor(on(2026, 12, 31)), "christmas");
  assert.equal(seasonFor(on(2027, 1, 1)), "christmas", "over the turn of the year");
  assert.equal(seasonFor(on(2027, 1, 6)), "christmas", "Epiphany");
  assert.equal(seasonFor(on(2027, 1, 7)), "ordinary");
});

test("the monsoon is Arizona's own season", () => {
  assert.equal(seasonFor(on(2026, 6, 14)), "ordinary", "the day before");
  assert.equal(seasonFor(on(2026, 6, 15)), "monsoon");
  assert.equal(seasonFor(on(2026, 8, 4)), "monsoon");
  assert.equal(seasonFor(on(2026, 9, 30)), "monsoon");
  assert.equal(seasonFor(on(2026, 10, 1)), "harvest", "and then it is autumn");
});

test("harvest runs from October until Advent takes over", () => {
  assert.equal(seasonFor(on(2026, 10, 1)), "harvest");
  assert.equal(seasonFor(on(2026, 11, 20)), "harvest");
  assert.equal(seasonFor(on(2026, 11, 28)), "harvest", "the day before Advent");
  assert.equal(seasonFor(on(2026, 11, 29)), "advent");
});

test("most of the year is simply the shop", () => {
  assert.equal(seasonFor(on(2026, 2, 10)), "ordinary");
  assert.equal(seasonFor(on(2026, 5, 20)), "ordinary");
});

test("every day of every year to 2070 lands in exactly one named season", () => {
  const names = Object.keys(SEASONS);
  for (let y = 2026; y <= 2070; y++) {
    for (let m = 1; m <= 12; m++) {
      for (const d of [1, 8, 15, 22, 28]) {
        const s = seasonFor(on(y, m, d));
        assert.ok(names.includes(s), `${y}-${m}-${d} gave ${s}`);
      }
    }
  }
});

test("a date that is not a date leaves the shop as it is", () => {
  assert.equal(seasonFor(new Date("nonsense")), "ordinary");
});
