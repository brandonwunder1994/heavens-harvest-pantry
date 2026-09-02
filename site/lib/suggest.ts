import type { Flavor } from "@/lib/content";

/**
 * "What should I try?" — four questions, and a flavor at the end.
 *
 * The hard part is that her menu is hers. She renames flavors, adds them and
 * takes them off whenever she likes, so a fixed answer table would be wrong the
 * first week she changed anything. Instead every flavor is read — its name, the
 * line about it, and its ingredients — and scored against what somebody said
 * they wanted.
 *
 * When nothing scores, it says so and offers the one people start with, rather
 * than naming a flavor at random and calling it a recommendation.
 *
 * Import-free apart from the type, so `node --test` runs it directly.
 */

export type Choice = { value: string; label: string; hint: string };
export type Question = { id: string; ask: string; choices: Choice[] };

/**
 * The words each answer looks for. They are matched against everything she has
 * written about a flavor, so "toasted almonds" in the ingredients counts as
 * much as "Almond" in the name.
 */
const SIGNALS: Record<string, string[]> = {
  crunchy: ["crunch", "cluster", "nut", "almond", "pecan", "walnut", "seed", "brittle", "crisp", "toasted"],
  chewy: ["chewy", "soft", "oat", "date", "raisin", "apple", "apricot", "coconut", "fig", "berry"],
  sweet: ["honey", "maple", "syrup", "sugar", "chocolate", "vanilla", "brown sugar", "date"],
  toasty: ["toasted", "roast", "sea salt", "salt", "olive oil", "cacao", "nib", "dark", "cinnamon"],
  fruit: ["apple", "berry", "raisin", "cranberry", "apricot", "orange", "fig", "banana", "cherry"],
  chocolate: ["chocolate", "cacao", "nib", "cocoa", "dark"],
  spice: ["cinnamon", "ginger", "nutmeg", "cardamom", "pumpkin", "clove", "chai", "spice"],
  plain: ["oat", "honey", "sea salt", "olive oil", "vanilla"],
  morning: ["oat", "honey", "cinnamon", "apple", "almond"],
  pudding: ["chocolate", "cacao", "sugar", "maple", "coconut", "dessert"],
};

export const QUESTIONS: Question[] = [
  {
    id: "bite",
    ask: "First thing in the morning, what do you want it to do?",
    choices: [
      { value: "crunchy", label: "Crunch", hint: "Big clusters you can hear" },
      { value: "chewy", label: "Give a little", hint: "Softer, oatier, kinder on an early start" },
    ],
  },
  {
    id: "lean",
    ask: "And how do you take it?",
    choices: [
      { value: "sweet", label: "On the sweet side", hint: "Honey, maple, a little sugar" },
      { value: "toasty", label: "On the toasty side", hint: "Roasted, darker, a pinch of salt" },
    ],
  },
  {
    id: "with",
    ask: "What would you like in it?",
    choices: [
      { value: "fruit", label: "Something fruity", hint: "Apple, berries, dried fruit" },
      { value: "chocolate", label: "Chocolate", hint: "Proper chocolate, not a hint of it" },
      { value: "spice", label: "Something warm", hint: "Cinnamon and the like" },
      { value: "plain", label: "Leave it alone", hint: "Oats, honey, nuts and not much else" },
    ],
  },
  {
    id: "when",
    ask: "And when are you eating it?",
    choices: [
      { value: "morning", label: "Breakfast, most days", hint: "The one that becomes a habit" },
      { value: "pudding", label: "Standing at the counter at nine at night", hint: "No judgement here" },
    ],
  },
];

/** The colour the page drifts toward as the answers come in. */
export const TINTS: Record<string, string> = {
  crunchy: "#e6d9bd",
  chewy: "#eae3d2",
  sweet: "#f0dcb4",
  toasty: "#ddc8a6",
  fruit: "#e9d3c6",
  chocolate: "#d9c6b2",
  spice: "#eed6b0",
  plain: "#eae6d6",
  morning: "#f1e6cc",
  pudding: "#d8c8b6",
};

export type Answers = Record<string, string>;

export type Suggestion =
  | { kind: "match"; flavor: Flavor; because: string[] }
  | { kind: "nothing-fits"; flavor: Flavor | null };

const haystack = (flavor: Flavor): string =>
  `${flavor.name} ${flavor.blurb} ${flavor.ingredients}`.toLowerCase();

/** How well one flavor answers one thing somebody asked for. */
export function scoreOne(flavor: Flavor, answer: string): number {
  const words = SIGNALS[answer];
  if (!words) return 0;
  const text = haystack(flavor);
  return words.reduce((n, word) => (text.includes(word) ? n + 1 : n), 0);
}

/**
 * The flavor that best answers what they said, and the words that earned it.
 *
 * Sold-out flavors are never suggested: there is no worse answer to "what
 * should I try" than something she cannot make this week.
 */
export function suggest(flavors: Flavor[], answers: Answers): Suggestion {
  const sellable = flavors.filter((f) => !f.soldOut);
  if (sellable.length === 0) return { kind: "nothing-fits", flavor: null };

  const given = Object.values(answers).filter(Boolean);
  if (given.length === 0) return { kind: "nothing-fits", flavor: sellable[0] };

  let best: Flavor | null = null;
  let bestScore = 0;

  for (const flavor of sellable) {
    const score = given.reduce((n, answer) => n + scoreOne(flavor, answer), 0);
    if (score > bestScore) {
      best = flavor;
      bestScore = score;
    }
  }

  // Nothing she sells has anything in common with what they asked for. Say so
  // rather than dress up the first flavor on the list as an answer.
  if (!best || bestScore === 0) return { kind: "nothing-fits", flavor: sellable[0] };

  const because = given.filter((answer) => scoreOne(best as Flavor, answer) > 0);
  return { kind: "match", flavor: best, because };
}

/** The one-line reason, in the words they chose rather than ours. */
export function reason(because: string[]): string {
  const said = because
    .map((value) => QUESTIONS.flatMap((q) => q.choices).find((c) => c.value === value)?.label ?? "")
    .filter(Boolean)
    .map((label) => label.toLowerCase());

  if (said.length === 0) return "";
  if (said.length === 1) return `Because you said ${said[0]}.`;
  const last = said[said.length - 1];
  return `Because you said ${said.slice(0, -1).join(", ")} and ${last}.`;
}
