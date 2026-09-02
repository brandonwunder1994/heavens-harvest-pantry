import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { normaliseEmail } from "@/lib/rewards";
import { readSession as read, signSession } from "@/lib/rewards-session";

/**
 * How a customer proves an email is theirs: one link, good for an hour, usable
 * once. After that a signed cookie keeps them signed in for a month, so they
 * only ask for a link when they change device.
 *
 * There is no password anywhere in this, which is the point.
 */

export const REWARDS_COOKIE = "hhp_rewards";
const LINK_MINUTES = 60;
const SESSION_DAYS = 30;

function secret(): string {
  return process.env.REWARDS_SESSION_SECRET ?? process.env.OWNER_SESSION_SECRET ?? "";
}

export const rewardsAuthReady = (): boolean => Boolean(secret());

const digest = (value: string): string => createHmac("sha256", secret()).update(value).digest("hex");

/** Creates a link token and stores only its hash, so the table is worthless if read. */
export async function issueLink(email: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + LINK_MINUTES * 60_000);

  await sql()`
    insert into login_links (token_hash, email, expires_at)
    values (${digest(token)}, ${normaliseEmail(email)}, ${expires.toISOString()})
  `;
  return token;
}

/** Spends a link token. Returns the email it belonged to, or null. */
export async function spendLink(token: string): Promise<string | null> {
  if (!token || !secret()) return null;

  const rows = (await sql()`
    update login_links set used_at = now()
    where token_hash = ${digest(token)} and used_at is null and expires_at > now()
    returning email
  `) as { email: string }[];

  return rows.length > 0 ? rows[0].email : null;
}

/**
 * Has a live link already gone out to this address in the last minute? A link
 * lasts an hour, so anything still an hour-minus-a-minute from expiry is fresh.
 */
export async function linkIssuedRecently(email: string): Promise<boolean> {
  const rows = (await sql()`
    select 1 from login_links
    where email = ${normaliseEmail(email)}
      and used_at is null
      and expires_at > now() + interval '59 minutes'
    limit 1
  `) as unknown[];
  return rows.length > 0;
}

/** Housekeeping: links that expired or were spent are of no further use. */
export async function sweepLinks(): Promise<void> {
  await sql()`delete from login_links where expires_at < now() - interval '7 days'`;
}

export const readSession = (token: string | undefined, now = Date.now()): string | null =>
  read(secret(), token, now);

export async function startRewardsSession(email: string): Promise<void> {
  const store = await cookies();
  const expiresAt = Date.now() + SESSION_DAYS * 86_400_000;

  store.set(REWARDS_COOKIE, signSession(secret(), normaliseEmail(email), expiresAt), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endRewardsSession(): Promise<void> {
  const store = await cookies();
  store.delete(REWARDS_COOKIE);
}

export async function signedInEmail(): Promise<string | null> {
  const store = await cookies();
  return readSession(store.get(REWARDS_COOKIE)?.value);
}
