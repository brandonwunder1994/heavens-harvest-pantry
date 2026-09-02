// The porch light.
//
// A small warm lamp in the strip at the top of every page: lit when she is
// baking this week, out when she has sold out. She flips it from her phone.
//
// The whole point is that it answers a returning customer's only question at a
// glance, so the one thing it must never do is answer it wrongly. Everything
// below exists to make sure it either tells the truth or says nothing at all.

/** Exactly what is stored. Nothing else about the shop is involved. */
export type Porch = {
  /** true = baking, false = sold out, null = she has never touched it. */
  lit: boolean | null;
  /** Her own words, in her own voice. Optional, and shown as written. */
  note: string;
  /** When she last flipped it. ISO 8601, or null if she never has. */
  flippedAt: string | null;
};

export const noPorch: Porch = { lit: null, note: "", flippedAt: null };

/**
 * How long the site keeps believing her.
 *
 * She bakes weekly, so three weeks of silence means the light is not being
 * flipped rather than that nothing has changed. A lamp that has said "baking
 * this week" since April is worse than no lamp at all, so after this it simply
 * goes away and the strip reads as it did before the feature existed.
 */
export const TRUSTED_FOR_DAYS = 21;

const DAY = 86_400_000;

export type PorchState =
  | { show: false; why: "never-set" | "stale"; daysOld: number | null }
  | { show: true; lit: boolean; note: string; daysOld: number };

/** What a visitor should see right now. */
export function porchState(porch: Porch, now: Date = new Date()): PorchState {
  if (porch.lit === null || !porch.flippedAt) {
    return { show: false, why: "never-set", daysOld: null };
  }

  const flipped = new Date(porch.flippedAt);
  if (Number.isNaN(flipped.getTime())) {
    return { show: false, why: "never-set", daysOld: null };
  }

  // A clock skewed into the future is not a reason to hide the light.
  const daysOld = Math.max(0, Math.floor((now.getTime() - flipped.getTime()) / DAY));
  if (daysOld > TRUSTED_FOR_DAYS) {
    return { show: false, why: "stale", daysOld };
  }

  return { show: true, lit: porch.lit, note: porch.note.trim(), daysOld };
}

/** The line the visitor reads, when her own note is empty. */
export function defaultNote(lit: boolean): string {
  return lit ? "Baking this week" : "Sold out this week";
}

/** What she should be told on her own page, in her own terms. */
export function ownerStatus(porch: Porch, now: Date = new Date()) {
  const state = porchState(porch, now);
  if (!state.show) {
    return {
      tone: "off" as const,
      headline: state.why === "never-set" ? "The light is off" : "The light has gone out",
      detail:
        state.why === "never-set"
          ? "Nobody is being told anything yet. Flip it and it appears at the top of every page."
          : `You last flipped it ${state.daysOld} days ago, so the site stopped saying it. Flip it again and it comes straight back.`,
    };
  }

  const left = TRUSTED_FOR_DAYS - state.daysOld;
  return {
    tone: state.lit ? ("lit" as const) : ("out" as const),
    headline: state.lit ? "Your light is on" : "Your light is out",
    detail:
      left <= 5
        ? `Everyone can see this. It goes away on its own in ${left} ${left === 1 ? "day" : "days"} unless you flip it.`
        : "Everyone can see this at the top of every page.",
  };
}

/** Flipping it. Always stamps the time, because the time is the honesty. */
export function flip(porch: Porch, lit: boolean, note = porch.note, now: Date = new Date()): Porch {
  return { lit, note: note.trim(), flippedAt: now.toISOString() };
}
