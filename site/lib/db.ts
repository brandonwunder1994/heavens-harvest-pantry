import "server-only";
import { neon } from "@neondatabase/serverless";

/**
 * The one place the database is opened. Everything writable the owner controls
 * lives here: her flavors and prices, the weekly verse, rewards points and the
 * reviews waiting for her to approve them.
 *
 * `lib/content.ts` is still the source of the DEFAULTS. This overlays them, so
 * an empty or unreachable database renders the site exactly as it looks today
 * rather than a blank page.
 */
export const databaseReady = Boolean(process.env.DATABASE_URL);

let client: ReturnType<typeof neon> | null = null;

export function sql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  client ??= neon(process.env.DATABASE_URL);
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
