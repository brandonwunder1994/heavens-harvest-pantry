import "server-only";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = "hhp_owner";
const SESSION_HOURS = 12;

/**
 * The password is never in this repository. Vercel holds a scrypt hash of it,
 * in the form salt:hash, and only the hash is ever compared.
 */
export function ownerConfigured(): boolean {
  if (!process.env.OWNER_USERNAME || !sessionSecret()) return false;

  // A hash that is present but malformed would fail every comparison, so she
  // would be told her own password is wrong, forever. That reads as not set up.
  const [salt, hash] = (process.env.OWNER_PASSWORD_HASH ?? "").split(":");
  return Boolean(salt && hash && /^[0-9a-f]+$/i.test(salt) && /^[0-9a-f]+$/i.test(hash));
}

function sessionSecret(): string {
  return process.env.OWNER_SESSION_SECRET ?? "";
}

export async function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const key = await scrypt(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const expectedUser = process.env.OWNER_USERNAME ?? "";
  const stored = process.env.OWNER_PASSWORD_HASH ?? "";
  if (!expectedUser || !stored) return false;

  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  // Both checks always run, so a wrong username takes the same time as a
  // wrong password and neither can be learned from how long the answer took.
  const userOk = safeEqual(username.trim().toLowerCase(), expectedUser.trim().toLowerCase());
  let passOk = false;
  try {
    const derived = await scrypt(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    passOk = derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    passOk = false;
  }
  return userOk && passOk;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

export function createToken(now = Date.now()): string {
  const expires = now + SESSION_HOURS * 60 * 60 * 1000;
  const payload = String(expires);
  return `${payload}.${sign(payload)}`;
}

export function tokenIsValid(token: string | undefined, now = Date.now()): boolean {
  if (!token || !sessionSecret()) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  if (signature.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;

  const expires = Number(payload);
  return Number.isFinite(expires) && expires > now;
}

export async function startSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function isSignedIn(): Promise<boolean> {
  const store = await cookies();
  return tokenIsValid(store.get(SESSION_COOKIE)?.value);
}
