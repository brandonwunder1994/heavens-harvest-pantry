import "server-only";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { databaseReady, sql } from "@/lib/db";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = "hhp_owner";
const SESSION_HOURS = 12;

type OwnerRecord = {
  username: string | null;
  password_hash: string | null;
  session_secret: string | null;
  setup_token_hash: string | null;
  setup_expires_at: string | null;
};

/** The legacy environment variables remain a safe fallback for existing sites. */
function legacyOwnerConfigured(): boolean {
  if (!process.env.OWNER_USERNAME || !process.env.OWNER_SESSION_SECRET) return false;
  return validPasswordHash(process.env.OWNER_PASSWORD_HASH ?? "");
}

function validPasswordHash(stored: string): boolean {
  const [salt, hash] = stored.split(":");
  return Boolean(salt && hash && /^[0-9a-f]+$/i.test(salt) && /^[0-9a-f]+$/i.test(hash));
}

async function ownerRecord(): Promise<OwnerRecord | null> {
  if (!databaseReady) return null;
  try {
    const rows = (await sql()`select username, password_hash, session_secret, setup_token_hash, setup_expires_at from owner_auth where id = 1`) as OwnerRecord[];
    return rows[0] ?? null;
  } catch (error) {
    // Authentication must fail closed if the owner database cannot be read.
    console.error("[owner-auth] could not read owner access", error);
    return null;
  }
}

export async function ownerConfigured(): Promise<boolean> {
  if (legacyOwnerConfigured()) return true;
  const record = await ownerRecord();
  const accounts = await ownerAccounts();
  // Extra logins share the original session secret. Without that secret nobody
  // can be signed in, even if a username and password exist.
  return accounts.length > 0 && Boolean(record?.session_secret);
}

export async function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const key = await scrypt(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}

/**
 * Every owner row, plus the legacy environment account if it is still in use.
 * The session cookie is still signed with the original secret, so any of these
 * people land in the same owner's page.
 */
async function ownerAccounts(): Promise<{ username: string; password_hash: string }[]> {
  const accounts: { username: string; password_hash: string }[] = [];

  if (databaseReady) {
    try {
      const rows = (await sql()`
        select username, password_hash from owner_auth
        where username is not null and password_hash is not null
      `) as { username: string | null; password_hash: string | null }[];
      for (const row of rows) {
        if (row.username && row.password_hash && validPasswordHash(row.password_hash)) {
          accounts.push({ username: row.username, password_hash: row.password_hash });
        }
      }
    } catch (error) {
      console.error("[owner-auth] could not list owner access", error);
    }
  }

  const envUser = process.env.OWNER_USERNAME ?? "";
  const envHash = process.env.OWNER_PASSWORD_HASH ?? "";
  if (envUser && validPasswordHash(envHash)) {
    const taken = accounts.some((row) => row.username.trim().toLowerCase() === envUser.trim().toLowerCase());
    if (!taken) accounts.push({ username: envUser, password_hash: envHash });
  }

  return accounts;
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const wanted = username.trim().toLowerCase();
  const accounts = await ownerAccounts();
  const match = accounts.find((row) => row.username.trim().toLowerCase() === wanted);

  // A dummy hash keeps the scrypt work the same length whether the name exists
  // or not, so a miss does not answer faster than a hit.
  const stored = match?.password_hash ?? `${"0".repeat(32)}:${"0".repeat(128)}`;
  const expectedUser = match?.username ?? "\0".repeat(Math.max(wanted.length, 1));
  if (!validPasswordHash(stored) && !match) return false;

  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const userOk = safeEqual(wanted, expectedUser.trim().toLowerCase());
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

async function sessionSecret(): Promise<string> {
  const record = await ownerRecord();
  return record?.session_secret ?? process.env.OWNER_SESSION_SECRET ?? "";
}

async function sign(payload: string): Promise<string> {
  return createHmac("sha256", await sessionSecret()).update(payload).digest("hex");
}

export async function createToken(now = Date.now()): Promise<string> {
  const expires = now + SESSION_HOURS * 60 * 60 * 1000;
  const payload = String(expires);
  return `${payload}.${await sign(payload)}`;
}

export async function tokenIsValid(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token || !(await sessionSecret())) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = await sign(payload);
  if (signature.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;

  const expires = Number(payload);
  return Number.isFinite(expires) && expires > now;
}

export async function startSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await createToken(), {
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

/** Creates the one owner record after a valid, one-time invite has been used. */
export async function completeOwnerSetup(input: {
  token: string;
  username: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const username = input.username.trim();
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/i.test(username)) {
    return { ok: false, message: "Use 3–64 letters, numbers, periods, dashes, or underscores for the username." };
  }
  if (input.password.length < 12) {
    return { ok: false, message: "Use at least 12 characters for the password." };
  }
  if (!databaseReady) return { ok: false, message: "The owner setup service is not available right now." };

  const tokenHash = hashInviteToken(input.token);
  const passwordHash = await hashPassword(input.password);
  const newSessionSecret = randomBytes(32).toString("hex");
  try {
    const rows = (await sql()`
      update owner_auth
      set username = ${username}, password_hash = ${passwordHash}, session_secret = ${newSessionSecret},
          setup_token_hash = null, setup_expires_at = null, updated_at = now()
      where id = 1 and username is null and setup_token_hash = ${tokenHash} and setup_expires_at > now()
      returning id
    `) as { id: number }[];
    if (rows.length === 0) {
      return { ok: false, message: "That setup link has already been used or has expired. Ask Brandon for a new one." };
    }
    return { ok: true };
  } catch (error) {
    console.error("[owner-auth] could not complete owner setup", error);
    return { ok: false, message: "The account could not be created. Nothing was changed—please try again." };
  }
}

export async function setupLinkIsValid(token: string): Promise<boolean> {
  if (!token || !databaseReady) return false;
  try {
    const rows = (await sql()`
      select id from owner_auth
      where id = 1 and username is null and setup_token_hash = ${hashInviteToken(token)} and setup_expires_at > now()
    `) as { id: number }[];
    return rows.length === 1;
  } catch (error) {
    console.error("[owner-auth] could not validate owner invite", error);
    return false;
  }
}

export function hashInviteToken(token: string): string {
  return createHmac("sha256", "heavens-harvest-owner-invite").update(token).digest("hex");
}
