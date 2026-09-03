import type { Flavor } from "@/lib/content";

/**
 * What a flavor is made of, as something the eye can see.
 *
 * Honey almond is glossy and amber. Dark chocolate is matte and nearly black,
 * with salt catching the light. The jar on the menu shows the difference, and
 * this is where the difference is decided.
 *
 * The same problem as "What should I try?", and the same answer: her menu is
 * hers. A table keyed on slugs would be wrong the first week she renamed
 * something, so every flavor is read — its name, the line about it, its
 * ingredients — and the strongest match wins. Nothing matching is not a
 * failure; it is honey oats, which is what granola looks like.
 *
 * Import-free apart from the type, so `node --test` runs it directly.
 */

export type Material = {
  /** What it is, for anyone reading the code or a test. */
  key: string;
  /** Five shades, palest to darkest, in the order the scene expects them. */
  palette: [string, string, string, string, string];
  /** 0 is a mirror, 1 is chalk. Granola is never below about a third. */
  roughness: number;
  /** How much of the room it reflects. Chocolate is dull; honey is not. */
  gloss: number;
  /** Flecks of white catching the light — salt, sugar, coconut. */
  sparkle: number;
};

/** Oats, honey, nuts and not much else — and the fallback for anything else. */
export const PLAIN: Material = {
  key: "oat",
  palette: ["#d9b979", "#bd8843", "#94612c", "#5a3616", "#e7d5ab"],
  roughness: 0.9,
  gloss: 0.7,
  sparkle: 0,
};

/**
 * The words each look is made of. Order matters only for ties: the first
 * listed wins, which is why chocolate sits above nuts — a chocolate almond
 * granola looks like chocolate.
 */
const LOOKS: { material: Material; words: string[] }[] = [
  {
    material: {
      key: "chocolate",
      palette: ["#8a6a4a", "#5c3a24", "#3c2415", "#1f1109", "#c9ab86"],
      roughness: 0.96,
      gloss: 0.34,
      sparkle: 0,
    },
    words: ["chocolate", "cacao", "cocoa", "nib", "brownie", "fudge"],
  },
  {
    material: {
      key: "maple",
      palette: ["#dcae6a", "#c07f34", "#8f5620", "#54300f", "#eacd97"],
      roughness: 0.82,
      gloss: 0.86,
      sparkle: 0,
    },
    words: ["maple", "syrup", "caramel", "toffee", "butterscotch"],
  },
  {
    material: {
      key: "honey",
      palette: ["#e8c983", "#cf9945", "#a8702f", "#6a4318", "#f2ddaf"],
      roughness: 0.72,
      gloss: 1,
      sparkle: 0,
    },
    words: ["honey", "golden", "glossy", "almond", "vanilla"],
  },
  {
    material: {
      key: "cinnamon",
      palette: ["#d9a86e", "#b5763a", "#8a4b23", "#4f2711", "#e6c79a"],
      roughness: 0.93,
      gloss: 0.6,
      sparkle: 0,
    },
    words: ["cinnamon", "apple", "spice", "chai", "ginger", "nutmeg", "pumpkin", "clove"],
  },
  {
    material: {
      key: "berry",
      palette: ["#d8ab7c", "#b8623f", "#8d2f28", "#4d1613", "#e5cba4"],
      roughness: 0.88,
      gloss: 0.72,
      sparkle: 0,
    },
    words: ["berry", "cranberry", "cherry", "strawberry", "raspberry", "raisin", "fruit"],
  },
  {
    material: {
      key: "coconut",
      palette: ["#f0e3c4", "#d9bf8e", "#b18f56", "#6f5228", "#fbf3de"],
      roughness: 0.95,
      gloss: 0.66,
      sparkle: 0.8,
    },
    words: ["coconut", "white chocolate", "macadamia", "cashew"],
  },
];

/** Salt and sugar are a finish, not a flavor: they sit on top of any of these. */
const SPARKLE = ["sea salt", "salt", "sugar", "crystal", "flake"];

function words(flavor: Pick<Flavor, "name" | "blurb" | "ingredients">): string {
  return `${flavor.name} ${flavor.blurb} ${flavor.ingredients}`.toLowerCase();
}

function hits(text: string, list: string[]): number {
  let n = 0;
  for (const word of list) if (text.includes(word)) n++;
  return n;
}

/**
 * The look of one flavor. Never throws, never returns nothing: a flavor she has
 * described in words this file has never heard of is honey oats, which is a
 * perfectly good jar of granola.
 */
export function materialFor(flavor: Pick<Flavor, "name" | "blurb" | "ingredients">): Material {
  const text = words(flavor);

  let best = PLAIN;
  let score = 0;
  for (const look of LOOKS) {
    const n = hits(text, look.words);
    if (n > score) {
      score = n;
      best = look.material;
    }
  }

  const salt = hits(text, SPARKLE);
  if (!salt) return best;

  // Flakes on the surface, and a shade less dull for the light they catch.
  return {
    ...best,
    sparkle: Math.min(1, best.sparkle + Math.min(salt, 2) * 0.42),
    roughness: Math.max(0.55, best.roughness - 0.04),
  };
}
