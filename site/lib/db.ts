import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * The one place the database is opened. Everything writable the owner controls
 * lives here: her flavors and prices, the weekly verse, rewards points and the
 * reviews waiting for her to approve them.
 *
 * `lib/content.ts` is still the source of the DEFAULTS. This overlays them, so
 * an empty or unreachable database renders the site exactly as it looks today
 * rather than a blank page.
 */
// Previews can show the owner's current content, but must never use the
// production write credential inherited from the Neon integration.
const databaseUrl = process.env.VERCEL_ENV === "preview"
  ? process.env.REVIEW_DATABASE_URL
  : process.env.DATABASE_URL;

export const databaseReady = Boolean(databaseUrl);

let client: NeonQueryFunction<false,false> | null = null;

export function sql(): NeonQueryFunction<false,false> {
  if (!databaseUrl) {
    throw new Error(process.env.VERCEL_ENV === "preview"
      ? "REVIEW_DATABASE_URL is not set for this preview"
      : "DATABASE_URL is not set");
  }
  client ??= neon(databaseUrl);
  return client;
}

/**
 * Run a read that must never take the site down. A cold database, a network
 * blip or a missing table all fall back to whatever the caller says is normal.
 */
export async function safely<T>(what: string, read: () => Promise<T>, fallback: T): Promise<T> {
  if (!databaseReady) return fallback;
  try {
    return await read();
  } catch (error) {
    console.error(`[db] ${what} failed, using the built-in default`, error);
    return fallback;
  }
}
