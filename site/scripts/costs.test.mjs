// Proves the production-cost arithmetic: ingredient prices in, cost per bag and profit out.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanCosts, emptyCosts, unitCost, costPerOz, bagCost, bagMargin, rollup } from "@/lib/costs.ts";

const costs = cleanCosts({
  ingredients: [
    { id: "oats", name: "Oats", unit: "lb", packQty: 25, packPrice: 40 },
    { id: "cashews", name: "Cashews", unit: "lb", packQty: 2, packPrice: 18 },
    { id: "bag", name: "Bags", unit: "each", packQty: 100, packPrice: 25 },
    { id: "sticker", name: "Stickers", unit: "each", packQty: 500, packPrice: 20 },
  ],
  recipes: { a: { yieldOz: 100, lines: [{ ingredientId: "oats", amount: 80 }, { ingredientId: "cashews", amount: 20 }] } },
  packaging: { "8": [{ ingredientId: "bag", amount: 1 }, { ingredientId: "sticker", amount: 1 }] },
  feePercent: 3,
  feeFixed: 0.3,
});

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);

test("a pound price becomes a price per ounce", () => {
  near(unitCost(costs.ingredients[0]), 0.1);
  near(unitCost(costs.ingredients[2]), 0.25);
});

test("cost per ounce comes from the batch recipe and its yield", () => {
  // 80 oz oats at $0.10 + 20 oz cashews at $0.5625 = $8 + $11.25 over 100 oz
  near(costPerOz(costs, "a"), 0.1925);
});

test("a bag costs its granola plus its packaging", () => {
  const c = bagCost(costs, "a", 8);
  near(c.ingredients, 1.54);
  near(c.packaging, 0.29);
  near(c.total, 1.83);
});

test("profit subtracts the card fee", () => {
  const m = bagMargin(costs, "a", 8, 10);
  near(m.cost, 2.13);
  near(m.profit, 7.87);
});

test("a flavor with no recipe says so instead of guessing", () => {
  assert.equal(costPerOz(costs, "missing"), null);
  assert.equal(bagMargin(costs, "missing", 8, 10), null);
  assert.equal(rollup(costs, [{ slug: "missing", sizeOz: 8, qty: 2, priceEach: 10 }], 1).unknownBags, 2);
});

test("a week's roll-up adds revenue, cost, fees and profit", () => {
  const r = rollup(costs, [{ slug: "a", sizeOz: 8, qty: 2, priceEach: 10 }], 1);
  assert.equal(r.revenue, 20);
  near(r.cost, 3.66);
  near(r.fees, 0.9);
  near(r.profit, 15.44);
});

test("junk from the browser is cleaned, not trusted", () => {
  const dirty = cleanCosts({
    ingredients: [{ id: "x y!", name: "  Thing ", unit: "stone", packQty: -5, packPrice: "abc" }, { id: "", name: "no id" }],
    recipes: { s: { yieldOz: 1e12, lines: [{ ingredientId: "ghost", amount: 5 }] } },
    feePercent: 999,
  });
  assert.equal(dirty.ingredients.length, 1);
  assert.equal(dirty.ingredients[0].id, "xy");
  assert.equal(dirty.ingredients[0].unit, "oz");
  assert.equal(dirty.ingredients[0].packQty, 0);
  assert.equal(dirty.recipes.s.lines.length, 0);
  assert.equal(dirty.feePercent, 20);
  assert.deepEqual(cleanCosts(null), emptyCosts());
});
