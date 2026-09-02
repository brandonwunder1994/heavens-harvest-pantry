import "server-only";

/**
 * A brake on password guessing.
 *
 * There is one username and one password on this site, so an unlimited guessing
 * rate is the whole attack. This counts failures per address in memory, which on
 * a serverless host means per running instance — a real attacker spread across
 * instances gets more tries than the number below suggests. It is a brake, not
 * a lock, and it is worth having anyway: it turns an overnight run of millions
 * of guesses into a handful.
 */

const WINDOW_MS = 15 * 60_000;
const ALLOWED = 10;

const attempts = new Map<string, { count: number; until: number }>();

export function tooManyAttempts(key: string, now = Date.now()): boolean {
  const seen = attempts.get(key);
  if (!seen || seen.until < now) return false;
  return seen.count >= ALLOWED;
}

export function recordFailure(key: string, now = Date.now()): void {
  const seen = attempts.get(key);
  if (!seen || seen.until < now) {
    attempts.set(key, { count: 1, until: now + WINDOW_MS });
    return;
  }
  seen.count += 1;

  // Keep the table from growing without bound on a long-lived instance.
  if (attempts.size > 5_000) {
    for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
  }
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}
