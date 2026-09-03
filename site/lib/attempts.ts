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

// --------------------------------------------------------------- a budget

/**
 * A budget for anything a stranger can ask the site to write down.
 *
 * The password brake above counts failures; this counts *goes*, successful or
 * not, because the thing being defended is different. A card that anybody can
 * write and that gets its own web address is a free notice board unless
 * somebody is holding the pen — so each address gets a handful an hour.
 *
 * Same caveat as above: this is per running instance, so it is a brake rather
 * than a lock. It turns a script writing ten thousand cards into a script
 * writing a few dozen, which is the difference that matters.
 */
const budgets = new Map<string, { spent: number; until: number }>();

export function spend(key: string, allowed: number, windowMs: number, now = Date.now()): boolean {
  const seen = budgets.get(key);

  if (!seen || seen.until < now) {
    budgets.set(key, { spent: 1, until: now + windowMs });

    if (budgets.size > 5_000) {
      for (const [k, v] of budgets) if (v.until < now) budgets.delete(k);
    }
    return true;
  }

  if (seen.spent >= allowed) return false;
  seen.spent += 1;
  return true;
}

/** For tests, and for nothing else. */
export function forgetBudgets(): void {
  budgets.clear();
}
