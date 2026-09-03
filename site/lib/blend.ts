import type { Flavor } from "@/lib/content";

/**
 * Build your blend — inside what she can actually bake.
 *
 * Somebody picks what they want in a jar. The list they pick from is not a
 * separate menu somebody has to keep up to date: it is everything she has named
 * as an add-in across her own flavors. So the only blends that can be built are
 * blends she already bakes, in batches she has already costed, under labels she
 * has already written. Nothing here can invent a jar she would have to make one
 * of.
 *
 * When a set of choices is not one of hers, it says so and names the nearest,
 * rather than quietly selling something else.
 *
 * Import-free apart from the type, so `node --test` runs it directly.
 */

export type Match = {
  /** Exactly what she bakes, or null if nobody bakes this. */
  exact: Flavor | null;
  /** The nearest thing on her menu, whether or not it is exact. */
  closest: Flavor | null;
  /** Chosen, but not in the closest one. */
  missing: string[];
  /** In the closest one, but not chosen. */
  extra: string[];
};

const tidy = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.;]+$/, "").trim();

/**
 * In every jar, and so never a choice: picking "oats" would be picking nothing.
 */
const BASE = ["rolled oats", "oats", "olive oil", "oil", "water"];

/**
 * Words about where something came from rather than what it is.
 *
 * Her label says "local honey" on one flavour and "honey" on another, which is
 * how anybody writes a label and no way at all to run a list of choices —
 * two tiles that mean the same thing. Dropped only from the front of a word,
 * so "dark chocolate" and "dried apple" stay exactly as they are.
 */
const SOURCING = /^(local|organic|real|fresh|raw|pure|toasted|roasted) /;

/**
 * What she puts in this one, besides the oats.
 *
 * She can write this out herself, and where she has, that is the answer. Where
 * she has not, it is read from the ingredients she has already written for the
 * label — which means the builder works the day she adds a flavour, rather than
 * the day she remembers to fill in a second field about it.
 */
export function addInsOf(flavor: Pick<Flavor, "addIns" | "ingredients">): string[] {
  const written = String(flavor.addIns ?? "").split(",").map(tidy).filter(Boolean);
  if (written.length) return written;

  const seen = new Set<string>();
  for (const raw of String(flavor.ingredients ?? "").split(",")) {
    const item = tidy(raw).replace(SOURCING, "");
    if (item && !BASE.includes(item)) seen.add(item);
  }
  return [...seen];
}

/**
 * Everything she stocks, as one list.
 *
 * A flavor that is sold out is still on the list: what she stocks has not
 * changed just because this week's batch has gone, and hiding an add-in would
 * make the builder's choices flicker week to week.
 *
 * Ordered by how many of her flavors use each one, so the things she reaches
 * for most are the first things offered.
 */
export function stockOf(flavors: Pick<Flavor, "addIns" | "ingredients">[]): string[] {
  const counts = new Map<string, number>();
  for (const flavor of flavors) {
    for (const item of new Set(addInsOf(flavor))) {
      counts.set(item, (counts.get(item) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([item]) => item);
}

/**
 * Which of her flavors this set of choices is.
 *
 * Sold-out flavors can be matched but never returned as `exact`, because an
 * exact match is an offer to sell — and she has nothing to sell this week.
 */
export function matchBlend(flavors: Flavor[], chosen: string[]): Match {
  const want = new Set(chosen.map(tidy).filter(Boolean));

  let best: Flavor | null = null;
  let bestScore = -Infinity;
  let exact: Flavor | null = null;

  for (const flavor of flavors) {
    const has = new Set(addInsOf(flavor));
    if (!has.size) continue;

    let shared = 0;
    for (const item of want) if (has.has(item)) shared++;
    const missing = want.size - shared;
    const extra = has.size - shared;

    if (!missing && !extra && !flavor.soldOut && !exact) exact = flavor;

    // Something she does not put in is a worse mistake than something she does
    // and you did not ask for: nobody minds a little cinnamon, everybody minds
    // the chocolate they asked for not being there.
    const score = shared * 3 - missing * 2 - extra - (flavor.soldOut ? 0.5 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = flavor;
    }
  }

  if (!best) return { exact: null, closest: null, missing: [...want], extra: [] };

  const has = new Set(addInsOf(best));
  return {
    exact,
    closest: best,
    missing: [...want].filter((item) => !has.has(item)),
    extra: [...has].filter((item) => !want.has(item)),
  };
}

/** How the name on the label is allowed to look. */
export const NAME_LIMIT = 22;

/**
 * A name somebody wants on the glass, made safe to draw and safe to store.
 *
 * Anything that is not a letter, a number, a space or the punctuation a name
 * actually contains is dropped rather than escaped, because this ends up on a
 * printed label and in her kitchen, not only in a browser.
 */
export function cleanName(value: unknown): string {
  if (typeof value !== "string") return "";
  // Runs of space, tab and newline become one space FIRST. Dropping the
  // characters first would weld a name written over two lines into one word.
  return value
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N} '’.\-&]/gu, "")
    .trim()
    .slice(0, NAME_LIMIT);
}
