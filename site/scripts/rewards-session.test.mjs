// Unit tests for the customer's rewards cookie. Run: npm test
//
// This exists because an earlier version packed the payload as
// `rewards.<email>.<expiry>` and read it back by splitting on every dot. Every
// email address contains a dot, so nobody could ever stay signed in — and it
// failed silently, so nothing anywhere said so.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readSession, signSession } from "../lib/rewards-session.ts";

const SECRET = "a-secret-that-only-exists-in-this-test";
const HOUR = 3_600_000;
const later = Date.now() + HOUR;

test("a real email address survives the round trip", () => {
  for (const email of [
    "bob@gmail.com",
    "first.last@example.co.uk",
    "ruth+granola@heavens.example",
    "bob@localhost",
  ]) {
    assert.equal(readSession(SECRET, signSession(SECRET, email, later)), email);
  }
});

test("an expired cookie signs nobody in", () => {
  const cookie = signSession(SECRET, "ruth@example.com", Date.now() - 1000);
  assert.equal(readSession(SECRET, cookie), null);
});

test("a tampered signature is refused", () => {
  const cookie = signSession(SECRET, "ruth@example.com", later);
  const [body] = cookie.split(".");
  assert.equal(readSession(SECRET, `${body}.deadbeef`), null);
});

test("changing the email invalidates the cookie", () => {
  const cookie = signSession(SECRET, "ruth@example.com", later);
  const signature = cookie.slice(cookie.lastIndexOf(".") + 1);
  const forged = Buffer.from(
    JSON.stringify({ kind: "rewards", email: "someone@else.com", expires: later }),
  ).toString("base64url");
  assert.equal(readSession(SECRET, `${forged}.${signature}`), null);
});

test("a cookie signed with another secret is refused", () => {
  const cookie = signSession("a-different-secret", "ruth@example.com", later);
  assert.equal(readSession(SECRET, cookie), null);
});

test("no secret means nobody is signed in", () => {
  assert.equal(readSession("", signSession(SECRET, "ruth@example.com", later)), null);
});

test("rubbish is refused rather than throwing", () => {
  for (const junk of [undefined, "", ".", "no-dot", "!!!.!!!", "e30.deadbeef"]) {
    assert.equal(readSession(SECRET, junk), null);
  }
});

test("an owner cookie cannot be used as a rewards cookie", () => {
  // The owner's token is `<expiry>.<signature>` over the expiry alone.
  const payload = String(later);
  const owner = `${Buffer.from(payload).toString("base64url")}.x`;
  assert.equal(readSession(SECRET, owner), null);
});
