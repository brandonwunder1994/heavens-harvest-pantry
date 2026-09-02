// Unit tests for what she is allowed to save, and for what the site does with
// whatever is already saved. Run: npm test
//
// The rule these prove: a save is either refused with a reason she can read, or
// it is the thing she typed. It is never quietly turned into the sample data
// and reported as "Saved."
import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultShop } from "../lib/content.ts";
import {
  checkBlock,
  mergeDelivery,
  mergeFlavors,
  mergeRewards,
  mergeShop,
  mergeVerse,
  slugify,
} from "../lib/shop-schema.ts";

const flavor = (over = {}) => ({
  slug: "honey-almond-crunch",
  name: "Honey Almond Crunch",
  blurb: "Local honey and toasted almonds.",
  ingredients: "Oats, honey, almonds.",
  allergens: "Tree nuts.",
  bagPrice: 9,
  jarPrice: 12,
  ...over,
});

// ------------------------------------------------------------ refusing a save

test("emptying the menu is refused, and says what to do instead", () => {
  const result = checkBlock("flavors", []);
  assert.equal(result.ok, false);
  assert.match(result.problem, /sold out/i);
});

test("a flavor with no price is refused by name", () => {
  const result = checkBlock("flavors", [flavor({ bagPrice: "" })]);
  assert.equal(result.ok, false);
  assert.match(result.problem, /Honey Almond Crunch/);
  assert.match(result.problem, /bag price/);
});

test("a price of zero is refused, because it would sell for nothing", () => {
  assert.equal(checkBlock("flavors", [flavor({ jarPrice: 0 })]).ok, false);
});

test("a price with cents is allowed", () => {
  assert.equal(checkBlock("flavors", [flavor({ bagPrice: 9.75 })]).ok, true);
});

test("two flavors with the same name are refused", () => {
  const result = checkBlock("flavors", [flavor(), flavor({ slug: "" })]);
  assert.equal(result.ok, false);
  assert.match(result.problem, /Two flavors/);
});

test("a flavor with no name is refused", () => {
  assert.equal(checkBlock("flavors", [flavor({ name: "  " })]).ok, false);
});

test("removing every delivery day is refused", () => {
  const result = checkBlock("delivery", { runs: [] });
  assert.equal(result.ok, false);
  assert.match(result.problem, /at least one delivery day/i);
});

test("a delivery day with no date is refused", () => {
  const result = checkBlock("delivery", { runs: [{ area: "Anthem", day: "Fri", nextDate: "" }] });
  assert.equal(result.ok, false);
  assert.match(result.problem, /Anthem/);
});

test("a blank verse is refused rather than silently keeping the old one", () => {
  const result = checkBlock("verseOfTheWeek", { text: "   ", reference: "Psalm 23" });
  assert.equal(result.ok, false);
  assert.match(result.problem, /empty/i);
});

test("a free bag at zero points is refused", () => {
  assert.equal(checkBlock("rewards", { rewardAt: 0, pointsPerDollar: 1 }).ok, false);
  assert.equal(checkBlock("rewards", { rewardAt: 100, pointsPerDollar: 1, welcomeBonus: 0, referralCredit: 0 }).ok, true);
});

test("a free blessing bag is refused", () => {
  assert.equal(checkBlock("blessingBag", { price: 0 }).ok, false);
  assert.equal(checkBlock("blessingBag", { price: 9 }).ok, true);
});

test("a good menu passes", () => {
  assert.equal(checkBlock("flavors", [flavor(), flavor({ slug: "maple", name: "Maple Pecan" })]).ok, true);
});

// -------------------------------------------------- reading back what is saved

test("her saved flavors are what the shop sells", () => {
  const shop = mergeShop(new Map([["flavors", [flavor({ name: "Pumpkin Spice", slug: "pumpkin" })]]]));
  assert.equal(shop.flavors.length, 1);
  assert.equal(shop.flavors[0].name, "Pumpkin Spice");
});

test("a duplicate slug is dropped, so one flavor is never sold at another's price", () => {
  const merged = mergeFlavors([flavor(), flavor({ name: "Honey Almond Crunch", bagPrice: 99 })]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].bagPrice, 9);
});

test("a nonsense row falls back to the built-in menu rather than an empty shop", () => {
  assert.deepEqual(mergeFlavors("not a list"), defaultShop.flavors);
  assert.deepEqual(mergeFlavors([]), defaultShop.flavors);
});

test("over-long text is cut rather than breaking a receipt", () => {
  const merged = mergeFlavors([flavor({ name: "x".repeat(500) })]);
  assert.ok(merged[0].name.length <= 80);
});

test("a run with no neighborhood is dropped", () => {
  const merged = mergeDelivery({ runs: [{ area: "", day: "Tue", nextDate: "Sep 8" }, { area: "Anthem", day: "Fri", nextDate: "Sep 11" }] });
  assert.equal(merged.runs.length, 1);
  assert.equal(merged.runs[0].area, "Anthem");
});

test("a reward threshold can never come back as zero", () => {
  assert.equal(mergeRewards({ rewardAt: 0 }).rewardAt, defaultShop.rewards.rewardAt);
  assert.equal(mergeRewards({ rewardAt: -5 }).rewardAt, defaultShop.rewards.rewardAt);
  assert.equal(mergeRewards({ rewardAt: "eighty" }).rewardAt, defaultShop.rewards.rewardAt);
  assert.equal(mergeRewards({ rewardAt: 80 }).rewardAt, 80);
});

test("junk in a rules block falls back per field, not per shop", () => {
  const shop = mergeShop(new Map([["jarRules", { creditDollars: "free", bonusPoints: 7 }]]));
  assert.equal(shop.jarRules.creditDollars, defaultShop.jarRules.creditDollars);
  assert.equal(shop.jarRules.bonusPoints, 7);
});

test("a blank verse falls back to the one it would have replaced", () => {
  const fallback = { text: "Taste and see", reference: "Psalm 34 : 8" };
  assert.deepEqual(mergeVerse({ text: "", reference: "x" }, fallback), fallback);
});

test("the hero band always follows this week's card", () => {
  const shop = mergeShop(new Map([["verseOfTheWeek", { text: "A new verse", reference: "Ps 23" }]]));
  assert.equal(shop.verses.hero.text, "A new verse");
});

// The calendar chooses the week's verse; she overrides it only when she wants to.
const calendar = { text: "The calendar's pick", reference: "Ecclesiastes 4 : 9" };

test("with nothing saved, the week's verse is the one the calendar chose", () => {
  const shop = mergeShop(new Map(), calendar);
  assert.deepEqual(shop.verseOfTheWeek, calendar);
  assert.deepEqual(shop.verses.hero, calendar);
});

test("her own words override the calendar", () => {
  const hers = { text: "Her own choice", reference: "Psalm 23 : 1" };
  const shop = mergeShop(new Map([["verseOfTheWeek", hers]]), calendar);
  assert.deepEqual(shop.verseOfTheWeek, hers);
});

test("a blank override falls back to the calendar, not to the samples", () => {
  const shop = mergeShop(new Map([["verseOfTheWeek", { text: "  ", reference: "x" }]]), calendar);
  assert.deepEqual(shop.verseOfTheWeek, calendar);
});

test("names become web addresses the same way every time", () => {
  assert.equal(slugify("Dark Chocolate & Sea Salt"), "dark-chocolate-sea-salt");
  assert.equal(slugify("  Maple  Pecan  "), "maple-pecan");
  assert.equal(slugify("!!!"), "");
});
