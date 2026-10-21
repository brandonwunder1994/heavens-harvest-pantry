// Proves the giveaway only takes a usable entry, finds repeat entrants, and
// never lets the Instagram button point anywhere but Instagram.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkEntry,
  checkGiveawaySetting,
  cleanInstagram,
  cleanPostUrl,
  drawLabel,
  roundKey,
  wheelName,
} from "@/lib/giveaway.ts";

const entry = (over = {}) => ({
  name: "Jane Doe",
  email: "Jane@Example.com ",
  instagram: "@Jane.Doe",
  phone: "",
  confirmed: true,
  ...over,
});

test("a good entry is tidied: email lowercased, @ dropped", () => {
  const result = checkEntry(entry());
  assert.equal(result.ok, true);
  assert.equal(result.draft.email, "jane@example.com");
  assert.equal(result.draft.instagram, "jane.doe");
});

test("an Instagram link or a bare name both work", () => {
  assert.equal(cleanInstagram("https://www.instagram.com/Jane.Doe/?hl=en"), "jane.doe");
  assert.equal(cleanInstagram("jane_doe"), "jane_doe");
  assert.equal(cleanInstagram("not a handle!"), "");
  assert.equal(cleanInstagram(""), "");
});

test("email, Instagram name and the like-and-share tick are required", () => {
  const result = checkEntry(entry({ email: "nope", instagram: "", confirmed: false }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.email);
  assert.ok(result.errors.instagram);
  assert.ok(result.errors.confirmed);
});

test("phone is optional but must look real when given", () => {
  assert.equal(checkEntry(entry({ phone: "" })).ok, true);
  assert.equal(checkEntry(entry({ phone: "(623) 555-0100" })).ok, true);
  assert.ok(checkEntry(entry({ phone: "123" })).errors.phone);
});

test("only an https Instagram link is accepted for the post", () => {
  assert.equal(cleanPostUrl("https://www.instagram.com/p/ABC123/"), "https://www.instagram.com/p/ABC123/");
  assert.equal(cleanPostUrl("http://www.instagram.com/p/ABC123/"), "");
  assert.equal(cleanPostUrl("https://evil.example/instagram.com/p/1"), "");
  assert.equal(cleanPostUrl("javascript:alert(1)"), "");
});

test("she cannot open the giveaway without a link, a date and a prize", () => {
  const base = { open: true, postUrl: "https://www.instagram.com/p/ABC/", drawDate: "2026-11-27", prize: "A free bag" };
  assert.equal(checkGiveawaySetting(base).ok, true);
  assert.equal(checkGiveawaySetting({ ...base, postUrl: "" }).ok, false);
  assert.equal(checkGiveawaySetting({ ...base, drawDate: "" }).ok, false);
  assert.equal(checkGiveawaySetting({ ...base, prize: "" }).ok, false);
  assert.equal(checkGiveawaySetting({ ...base, open: false, prize: "" }).ok, true);
  assert.equal(checkGiveawaySetting({ ...base, postUrl: "https://example.com/x" }).ok, false);
  assert.equal(checkGiveawaySetting({ ...base, drawDate: "2026-02-31" }).ok, false);
});

test("the round follows the draw date, and the label is human", () => {
  const setting = checkGiveawaySetting({ open: false, drawDate: "2026-11-27", drawTime: "7:00 PM" }).setting;
  assert.equal(roundKey(setting), "2026-11");
  assert.equal(drawLabel(setting), "Friday, November 27 at 7:00 PM Arizona time");
  assert.equal(roundKey({ ...setting, drawDate: "" }, Date.UTC(2026, 9, 20, 12)), "2026-10");
});

test("the wheel shows a first name and a last initial only", () => {
  assert.equal(wheelName("Jane Marie Doe"), "Jane D.");
  assert.equal(wheelName("Jane"), "Jane");
  assert.equal(wheelName("  "), "");
});
