// Unit tests for "what should I try?". Run: npm test
//
// Her menu is hers: she renames flavors and takes them off whenever she likes.
// So the rule that matters is that the answer is always read off the menu as it
// is today, and that it never names something she cannot make this week.
import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTIONS, TINTS, reason, scoreOne, suggest } from "../lib/suggest.ts";

const flavor = (over) => ({
  slug: "x",
  name: "X",
  blurb: "",
  ingredients: "",
  allergens: "",
  bagPrice: 9,
  jarPrice: 12,
  ...over,
});

const honey = flavor({
  slug: "honey-almond-crunch",
  name: "Honey Almond Crunch",
  blurb: "Local honey, toasted almonds, a little sea salt. The one people start with.",
  ingredients: "Rolled oats, local honey, almonds, olive oil, vanilla, sea salt.",
});

const chocolate = flavor({
  slug: "dark-chocolate-sea-salt",
  name: "Dark Chocolate Sea Salt",
  blurb: "Cacao nibs and dark chocolate chunks. Dessert that counts as breakfast.",
  ingredients: "Rolled oats, honey, dark chocolate, cacao nibs, olive oil, sea salt.",
});

const apple = flavor({
  slug: "cinnamon-apple",
  name: "Cinnamon Apple",
  blurb: "Dried apple, cinnamon, brown sugar. Tastes like October.",
  ingredients: "Rolled oats, dried apple, brown sugar, olive oil, cinnamon, sea salt.",
});

const menu = [honey, chocolate, apple];

// --------------------------------------------------------- the questions hold

test("there are four questions and every one has at least two answers", () => {
  assert.equal(QUESTIONS.length, 4);
  for (const q of QUESTIONS) assert.ok(q.choices.length >= 2, q.id);
});

test("every answer has a colour to drift toward", () => {
  for (const q of QUESTIONS) {
    for (const c of q.choices) assert.ok(TINTS[c.value], `${q.id}/${c.value}`);
  }
});

test("no two questions share an id, or one would overwrite the other", () => {
  const ids = QUESTIONS.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
});

// ------------------------------------------------------------- the scoring

test("a flavor is read by everything she wrote about it, not only its name", () => {
  // "toasted" is in the blurb and the ingredients, never in the name.
  assert.ok(scoreOne(honey, "crunchy") > 0);
  assert.ok(scoreOne(apple, "spice") > 0);
});

test("an answer nobody offered scores nothing rather than throwing", () => {
  assert.equal(scoreOne(honey, "not-an-answer"), 0);
});

// ----------------------------------------------------------- the suggestion

test("somebody who wants chocolate is sent to the chocolate one", () => {
  const out = suggest(menu, { with: "chocolate" });
  assert.equal(out.kind, "match");
  assert.equal(out.flavor.slug, "dark-chocolate-sea-salt");
});

test("somebody who wants something warm and fruity is sent to the apple one", () => {
  const out = suggest(menu, { with: "fruit", lean: "sweet" });
  assert.equal(out.kind, "match");
  assert.equal(out.flavor.slug, "cinnamon-apple");
});

test("a sold-out flavor is never suggested", () => {
  const out = suggest([{ ...chocolate, soldOut: true }, honey], { with: "chocolate" });
  assert.notEqual(out.flavor?.slug, "dark-chocolate-sea-salt");
});

test("when everything is sold out it says so rather than naming one", () => {
  const out = suggest(menu.map((f) => ({ ...f, soldOut: true })), { with: "chocolate" });
  assert.equal(out.kind, "nothing-fits");
  assert.equal(out.flavor, null);
});

test("when nothing on the menu fits, it says so instead of guessing", () => {
  const plainOnly = [flavor({ name: "Plain Oats", blurb: "Just oats.", ingredients: "Oats." })];
  const out = suggest(plainOnly, { with: "chocolate" });
  assert.equal(out.kind, "nothing-fits");
  assert.equal(out.flavor.name, "Plain Oats");
});

test("an empty menu is answered honestly, not with a crash", () => {
  const out = suggest([], { with: "chocolate" });
  assert.equal(out.kind, "nothing-fits");
  assert.equal(out.flavor, null);
});

test("answering nothing suggests nothing", () => {
  const out = suggest(menu, {});
  assert.equal(out.kind, "nothing-fits");
});

test("it works on a menu she has renamed entirely", () => {
  // Nothing here shares a word with the samples, but the ingredients still do.
  const hers = [
    flavor({ slug: "sunday-best", name: "Sunday Best", blurb: "Cacao nibs and dark chocolate.", ingredients: "Oats, dark chocolate, cacao nibs." }),
    flavor({ slug: "the-orchard", name: "The Orchard", blurb: "Dried apple and cinnamon.", ingredients: "Oats, dried apple, cinnamon." }),
  ];
  assert.equal(suggest(hers, { with: "chocolate" }).flavor.slug, "sunday-best");
  assert.equal(suggest(hers, { with: "fruit" }).flavor.slug, "the-orchard");
});

// ------------------------------------------------------------- the reason

test("the reason is given in the words they chose", () => {
  const out = suggest(menu, { with: "chocolate", lean: "toasty" });
  const said = reason(out.because);
  assert.match(said, /Because you said/);
  assert.match(said.toLowerCase(), /chocolate/);
});

test("one reason reads as one reason, two read as a pair", () => {
  assert.equal(reason(["chocolate"]), "Because you said chocolate.");
  assert.match(reason(["chocolate", "toasty"]), /chocolate and on the toasty side\.$/);
});

test("no reasons produces no sentence at all", () => {
  assert.equal(reason([]), "");
});
