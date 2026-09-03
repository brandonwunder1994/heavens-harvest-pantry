// Proves a card cannot be turned into a way of sending somebody somewhere else.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeCode,
  looksLikeCode,
  cleanNote,
  cleanWho,
  checkGift,
  NOTE_LIMIT,
  WHO_LIMIT,
  CODE_LENGTH,
} from "@/lib/gift.ts";

const VERSES = [
  { reference: "Psalm 34:8", text: "Taste and see that the Lord is good." },
  { reference: "Ruth 1:16", text: "Where you go I will go." },
];

test("a code is the right length and spells nothing", () => {
  for (let i = 0; i < 200; i++) {
    const code = makeCode();
    assert.equal(code.length, CODE_LENGTH);
    assert.ok(looksLikeCode(code), code);
    assert.ok(!/[aeiou01lo]/.test(code), `${code} could be misread or misheard`);
  }
});

test("two codes in a row are not the same code", () => {
  const seen = new Set(Array.from({ length: 500 }, () => makeCode()));
  assert.ok(seen.size > 495, `${seen.size} of 500 were different`);
});

test("only something this file could have made is a code", () => {
  assert.equal(looksLikeCode("bcdfghjkmn"), true);
  assert.equal(looksLikeCode("bcdfghjkm"), false, "too short");
  assert.equal(looksLikeCode("bcdfghjkmnp"), false, "too long");
  assert.equal(looksLikeCode("bcdfghjkma"), false, "a vowel");
  assert.equal(looksLikeCode("../../etc/p"), false);
  assert.equal(looksLikeCode(null), false);
  assert.equal(looksLikeCode(42), false);
});

test("a note keeps the words somebody wrote", () => {
  assert.equal(cleanNote("Thinking of you this week."), "Thinking of you this week.");
  assert.equal(cleanNote("Line one\n\nLine two"), "Line one\n\nLine two");
});

test("and never keeps a web address", () => {
  assert.equal(cleanNote("Look at https://example.com/x now"), "Look at now");
  assert.equal(cleanNote("go to www.example.com"), "go to");
  assert.equal(cleanNote("granola.shop is great"), "is great");
  assert.equal(cleanNote("mail me at mailto:a@b.com"), "mail me at");
  assert.equal(cleanNote("HTTPS://EXAMPLE.COM"), "");
});

test("a full stop in a sentence is not a web address", () => {
  assert.equal(cleanNote("We miss you. Come round."), "We miss you. Come round.");
  assert.equal(cleanNote("Love, Mrs. Hall"), "Love, Mrs. Hall");
});

test("a note is trimmed, tidied and capped", () => {
  assert.equal(cleanNote("  spaced   out  "), "spaced out");
  assert.equal(cleanNote("a\n\n\n\n\nb"), "a\n\nb");
  assert.equal(cleanNote("x".repeat(900)).length, NOTE_LIMIT);
  assert.equal(cleanNote(null), "");
  assert.equal(cleanNote(7), "");
});

test("control characters never reach a printed card", () => {
  assert.equal(cleanNote("Hi\u0000\u0007 there"), "Hi there");
  assert.equal(cleanNote("Hi\u007Fthere"), "Hithere");
});

test("a name is a name", () => {
  assert.equal(cleanWho("  Grace  "), "Grace");
  assert.equal(cleanWho("Mary-Anne O'Neill"), "Mary-Anne O'Neill");
  // The slash goes too, which is the point: nothing that looks like markup
  // or a path survives being written on a card.
  assert.equal(cleanWho("<b>Grace</b>"), "bGraceb");
  assert.equal(cleanWho("x".repeat(99)).length, WHO_LIMIT);
});

test("a card with everything on it is accepted", () => {
  const got = checkGift(
    { verseRef: "Ruth 1:16", note: "Thinking of you.", from: "Grace", to: "Ruth" },
    VERSES,
  );
  assert.equal(got.ok, true);
  assert.equal(got.gift.verseText, "Where you go I will go.");
  assert.equal(got.gift.to, "Ruth");
});

test("nobody gets to put words in her mouth", () => {
  const got = checkGift(
    { verseRef: "Nowhere 9:9", note: "hello", from: "a", to: "b" },
    VERSES,
  );
  assert.equal(got.ok, false);
  assert.match(got.why, /one of the verses/i);
});

test("a card missing a part says which part, in plain words", () => {
  const noTo = checkGift({ verseRef: "Ruth 1:16", note: "hi", from: "Grace" }, VERSES);
  assert.equal(noTo.ok, false);
  assert.match(noTo.why, /who is it for/i);

  const noFrom = checkGift({ verseRef: "Ruth 1:16", note: "hi", to: "Ruth" }, VERSES);
  assert.match(noFrom.why, /who is it from/i);

  const noNote = checkGift({ verseRef: "Ruth 1:16", from: "Grace", to: "Ruth" }, VERSES);
  assert.match(noNote.why, /write them a line/i);
});

test("a note that was only a link is a note with nothing in it", () => {
  const got = checkGift(
    { verseRef: "Ruth 1:16", note: "https://buy-my-thing.example", from: "a", to: "b" },
    VERSES,
  );
  assert.equal(got.ok, false, "so the card cannot be a link in disguise");
});
