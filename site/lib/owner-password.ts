import { scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (password: string, salt: string, keylen: number) => Promise<Buffer>;
export type PasswordChangeInput = { username: string; currentPassword: string; newPassword: string; confirmPassword: string };

export function passwordChangeProblem(input: PasswordChangeInput): string | null {
  if (!input.username.trim() || !input.currentPassword) return "Enter your username and current password.";
  if (input.username.trim().length > 64) return "Use the username you normally sign in with.";
  if (input.newPassword.length < 12) return "Use at least 12 characters for the new password.";
  if (input.newPassword.length > 256 || input.currentPassword.length > 256) return "Use no more than 256 characters for a password.";
  if (input.newPassword !== input.confirmPassword) return "The new passwords do not match. Enter them again.";
  if (input.newPassword === input.currentPassword) return "Choose a new password that is different from your current password.";
  return null;
}

export async function passwordMatches(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash || !/^[0-9a-f]+$/i.test(salt) || !/^[0-9a-f]{128}$/i.test(hash)) return false;
  try {
    const derived = await scrypt(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
