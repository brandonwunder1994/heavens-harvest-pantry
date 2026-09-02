import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signing and reading the customer's rewards cookie.
 *
 * Kept apart from `lib/rewards-auth.ts`, which reaches for the request's
 * cookies and so cannot be loaded by `node --test`. This half is the part with
 * the sharp edges, so it is the part that gets tested.
 *
 * The payload is signed JSON rather than dot-joined fields: an earlier version
 * packed it as `rewards.<email>.<expiry>` and split on the dot, which every
 * email address in the world also contains, so no real session could ever be
 * read back.
 */

export type Session = { kind: "rewards"; email: string; expires: number };

const digest = (secret: string, value: string): string =>
  createHmac("sha256", secret).update(value).digest("hex");

export function signSession(secret: string, email: string, expiresAt: number): string {
  const payload = JSON.stringify({ kind: "rewards", email, expires: expiresAt } satisfies Session);
  return `${Buffer.from(payload).toString("base64url")}.${digest(secret, payload)}`;
}

/** The email this cookie belongs to, or null for anything at all suspect. */
export function readSession(secret: string, token: string | undefined, now = Date.now()): string | null {
  if (!secret || !token) return null;

  const split = token.lastIndexOf(".");
  if (split < 1) return null;

  const encoded = token.slice(0, split);
  const signature = token.slice(split + 1);
  if (!encoded || !signature) return null;

  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString();
  } catch {
    return null;
  }

  const expected = digest(secret, payload);
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  let session: Partial<Session>;
  try {
    session = JSON.parse(payload) as Partial<Session>;
  } catch {
    return null;
  }

  if (session.kind !== "rewards") return null;
  if (typeof session.email !== "string" || !session.email) return null;
  if (typeof session.expires !== "number" || !Number.isFinite(session.expires)) return null;

  return session.expires > now ? session.email : null;
}
