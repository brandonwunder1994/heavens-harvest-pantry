import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import { passwordChangeProblem, passwordMatches } from "../lib/owner-password.ts";

const valid = { username: "owner", currentPassword: "temp", newPassword: "a memorable new password", confirmPassword: "a memorable new password" };
test("password change accepts the temporary current password and validates the replacement", () => {
  assert.equal(passwordChangeProblem(valid), null);
  for (const change of [{ username: " " }, { currentPassword: "" }, { newPassword: "short", confirmPassword: "short" }, { confirmPassword: "different password" }, { currentPassword: valid.newPassword }, { newPassword: "a".repeat(257) }]) {
    assert.equal(typeof passwordChangeProblem({ ...valid, ...change }), "string");
  }
});
test("scrypt verification accepts only the exact password and rejects malformed hashes", async () => {
  const salt = randomBytes(16).toString("hex");
  const password = "correct horse pantry harvest";
  const stored = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
  assert.equal(await passwordMatches(password, stored), true);
  assert.equal(await passwordMatches("temp", stored), false);
  assert.equal(await passwordMatches(password + " ", stored), false);
  for (const malformed of ["", "not-a-hash", `${salt}:00`, `${salt}:${"z".repeat(128)}`]) assert.equal(await passwordMatches(password, malformed), false);
});
