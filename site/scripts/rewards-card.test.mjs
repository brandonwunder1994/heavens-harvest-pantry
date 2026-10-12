import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

test("the punch card is a real photograph of the stock", () => {
  const bytes = readFileSync(join(publicDir, "rewards/card-stock.jpg"));
  assert.equal(bytes[0], 0xff);
  assert.equal(bytes[1], 0xd8);
  assert.ok(bytes.length > 80_000);
});

test("the punched lip is a cut PNG, not a stamp", () => {
  const bytes = readFileSync(join(publicDir, "rewards/punch-lip.png"));
  assert.equal(bytes[0], 0x89);
  assert.equal(bytes.toString("ascii", 1, 4), "PNG");
  assert.ok(bytes.length > 4_000);
});
