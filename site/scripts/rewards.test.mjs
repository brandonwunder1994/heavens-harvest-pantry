// Unit tests for points and reviews. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bagsEarned,
  balanceOf,
  looksLikeEmail,
  normaliseEmail,
  pointsToNext,
  progress,
  standing,
} from "../lib/rewards.ts";
import { averageRating, checkReview, starLine } from "../lib/reviews.ts";

const rules = { pointsPerDollar: 1, rewardAt: 100, welcomeBonus: 30, referralCredit: 3 };

test("a balance is the sum of everything that ever happened", () => {
  assert.equal(
    balanceOf([
      { delta: 30, reason: "Welcome bonus", createdAt: 0 },
      { delta: 18, reason: "Order", createdAt: 1 },
      { delta: -100, reason: "Free bag", createdAt: 2 },
    ]),
    -52,
  );
});

test("a free bag is earned at the threshold, not before it", () => {
  assert.equal(bagsEarned(99, rules), 0);
  assert.equal(bagsEarned(100, rules), 1);
  assert.equal(bagsEarned(250, rules), 2);
});

test("points to the next bag counts down and resets", () => {
  assert.equal(pointsToNext(0, rules), 100);
  assert.equal(pointsToNext(99, rules), 1);
  assert.equal(pointsToNext(100, rules), 100);
  assert.equal(pointsToNext(140, rules), 60);
});

test("a negative balance never reads as progress", () => {
  assert.equal(bagsEarned(-20, rules), 0);
  assert.equal(progress(-20, rules), 0);
  assert.equal(pointsToNext(-20, rules), 100);
});

test("turning the reward off does not divide by zero", () => {
  const off = { ...rules, rewardAt: 0 };
  assert.equal(bagsEarned(500, off), 0);
  assert.equal(pointsToNext(500, off), 0);
  assert.equal(progress(500, off), 0);
});

test("the progress bar fills across one bag", () => {
  assert.equal(progress(0, rules), 0);
  assert.equal(progress(50, rules), 0.5);
  assert.equal(progress(150, rules), 0.5);
});

test("where someone stands reads as a sentence", () => {
  assert.match(standing(40, rules), /60 points to your first free bag/);
  assert.match(standing(120, rules), /1 free bag waiting/);
});

test("emails are matched however they were typed", () => {
  assert.equal(normaliseEmail("  Ruth@Example.COM "), "ruth@example.com");
  assert.equal(looksLikeEmail("ruth@example.com"), true);
  assert.equal(looksLikeEmail("ruth@example"), false);
  assert.equal(looksLikeEmail("not an email"), false);
});

const flavors = ["Maple Pecan", "Honey Almond Crunch"];

test("a proper review is accepted and tidied", () => {
  const result = checkReview(
    { name: "  Ruth  ", email: "RUTH@example.com", flavor: "Maple Pecan", rating: "5", body: "Best granola on the street." },
    flavors,
  );
  assert.equal(result.ok, true);
  assert.equal(result.draft.name, "Ruth");
  assert.equal(result.draft.email, "ruth@example.com");
  assert.equal(result.draft.rating, 5);
});

test("a review with no name or no words is refused", () => {
  const result = checkReview({ name: "", rating: 5, body: "ok" }, flavors);
  assert.equal(result.ok, false);
  assert.ok(result.errors.name);
  assert.ok(result.errors.body);
});

test("a rating outside one to five is refused", () => {
  const bad = checkReview({ name: "Ruth", rating: 9, body: "A lovely thing indeed." }, flavors);
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.rating);
});

test("a flavor she has since renamed is dropped, not refused", () => {
  const result = checkReview(
    { name: "Ruth", rating: 4, flavor: "Pumpkin Spice", body: "A lovely thing indeed." },
    flavors,
  );
  assert.equal(result.ok, true);
  assert.equal(result.draft.flavor, "");
});

test("an email is optional but must look like one if given", () => {
  assert.equal(checkReview({ name: "Ruth", rating: 4, body: "A lovely thing indeed." }, flavors).ok, true);
  const bad = checkReview({ name: "Ruth", rating: 4, body: "A lovely thing indeed.", email: "nope" }, flavors);
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.email);
});

test("the average rounds to one decimal and never divides by zero", () => {
  assert.equal(averageRating([]), 0);
  const made = (rating) => ({ id: 1, name: "R", flavor: null, rating, body: "", approved: true, createdAt: 0 });
  assert.equal(averageRating([made(5), made(4)]), 4.5);
  assert.equal(averageRating([made(5), made(4), made(4)]), 4.3);
});

test("stars are drawn out of five, whatever the number", () => {
  assert.equal(starLine(5), "★★★★★");
  assert.equal(starLine(4.4), "★★★★☆");
  assert.equal(starLine(0), "☆☆☆☆☆");
  assert.equal(starLine(99), "★★★★★");
});
