/**
 * Small pictures of what a granola *is* — apple, maple, pecan — so the label
 * can show the flavor at a glance.
 *
 * A table keyed on slugs would go stale the week she renamed a bag. The name
 * is read left to right, and the first three things it names become the marks.
 * She can pin different ones on a flavor; if she does not, a new flavor still
 * gets marks the moment it has a name.
 *
 * Import-free apart from the type, so `node --test` runs it directly.
 */

export const FLAVOR_MARK_IDS = [
  "apple",
  "maple",
  "pecan",
  "chocolate",
  "coconut",
  "cashew",
  "vanilla",
  "blueberry",
  "almond",
  "honey",
  "cinnamon",
  "walnut",
  "cranberry",
  "pumpkin",
  "banana",
  "coffee",
  "lemon",
  "cherry",
  "pistachio",
  "hazelnut",
  "macadamia",
  "peanut",
  "salt",
  "candied",
  "pineapple",
  "berry",
  "fig",
  "oat",
] as const;

export type FlavorMarkId = (typeof FLAVOR_MARK_IDS)[number];

export type FlavorMarkSpec = {
  id: FlavorMarkId;
  label: string;
  aliases: string[];
};

/**
 * Longer aliases sit first so "dark chocolate" and "sea salt" win before the
 * shorter word they contain.
 */
export const FLAVOR_MARKS: FlavorMarkSpec[] = [
  { id: "apple", label: "Apple", aliases: ["apples", "apple"] },
  { id: "maple", label: "Maple", aliases: ["maple"] },
  { id: "pecan", label: "Pecan", aliases: ["pecans", "pecan"] },
  { id: "chocolate", label: "Chocolate", aliases: ["dark chocolate", "chocolate", "cacao", "cocoa"] },
  { id: "coconut", label: "Coconut", aliases: ["coconuts", "coconut"] },
  { id: "cashew", label: "Cashew", aliases: ["cashews", "cashew"] },
  { id: "vanilla", label: "Vanilla", aliases: ["vanilla"] },
  { id: "blueberry", label: "Blueberry", aliases: ["blueberries", "blueberry"] },
  { id: "almond", label: "Almond", aliases: ["almonds", "almond"] },
  { id: "honey", label: "Honey", aliases: ["honey"] },
  { id: "cinnamon", label: "Cinnamon", aliases: ["cinnamon"] },
  { id: "walnut", label: "Walnut", aliases: ["walnuts", "walnut"] },
  { id: "cranberry", label: "Cranberry", aliases: ["cranberries", "cranberry"] },
  { id: "pumpkin", label: "Pumpkin", aliases: ["pumpkin"] },
  { id: "banana", label: "Banana", aliases: ["bananas", "banana"] },
  { id: "coffee", label: "Coffee", aliases: ["espresso", "mocha", "coffee"] },
  { id: "lemon", label: "Lemon", aliases: ["lemon"] },
  { id: "cherry", label: "Cherry", aliases: ["cherries", "cherry"] },
  { id: "pistachio", label: "Pistachio", aliases: ["pistachios", "pistachio"] },
  { id: "hazelnut", label: "Hazelnut", aliases: ["hazelnuts", "hazelnut"] },
  { id: "macadamia", label: "Macadamia", aliases: ["macadamias", "macadamia"] },
  { id: "peanut", label: "Peanut", aliases: ["peanuts", "peanut"] },
  { id: "salt", label: "Sea salt", aliases: ["sea salt"] },
  { id: "candied", label: "Candied", aliases: ["candied", "candy"] },
  { id: "pineapple", label: "Pineapple", aliases: ["pineapple"] },
  { id: "berry", label: "Berry", aliases: ["berries", "berry"] },
  { id: "fig", label: "Fig", aliases: ["figs", "fig"] },
  { id: "oat", label: "Oat", aliases: ["oats", "oat"] },
];

const MARK_SET = new Set<string>(FLAVOR_MARK_IDS);

export function isFlavorMarkId(value: unknown): value is FlavorMarkId {
  return typeof value === "string" && MARK_SET.has(value);
}

export function sanitizeFlavorMarks(value: unknown): FlavorMarkId[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<FlavorMarkId>();
  const marks: FlavorMarkId[] = [];
  for (const raw of value) {
    if (!isFlavorMarkId(raw) || seen.has(raw)) continue;
    seen.add(raw);
    marks.push(raw);
    if (marks.length === 3) break;
  }
  return marks;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Index of a whole word, so "apple" does not steal the end of "pineapple". */
function indexOfWord(hay: string, needle: string): number {
  const pattern = new RegExp(`(^|[^a-z])${escapeRegExp(needle)}([^a-z]|$)`);
  const match = pattern.exec(hay);
  if (!match) return -1;
  return match.index + match[1].length;
}

/**
 * Marks named in this text, in the order they are written. "Apple Maple Pecan"
 * is apple, then maple, then pecan — never the other way around.
 */
export function scanFlavorMarks(text: string): FlavorMarkId[] {
  const hay = text.toLowerCase();
  const hits: { id: FlavorMarkId; at: number }[] = [];
  for (const spec of FLAVOR_MARKS) {
    let at = -1;
    for (const alias of spec.aliases) {
      const found = indexOfWord(hay, alias);
      if (found >= 0 && (at < 0 || found < at)) at = found;
    }
    if (at >= 0) hits.push({ id: spec.id, at });
  }
  hits.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  return hits.map((hit) => hit.id);
}

export type FlavorMarkSource = {
  icons?: Iterable<unknown> | null;
  name?: string;
  addIns?: string;
};

/**
 * What to draw on a label. Pinned icons win; otherwise the granola name is
 * read, then the add-ins. Oats and oil in the ingredient list are not flavors,
 * so they are not consulted.
 */
export function flavorMarksFor(source: FlavorMarkSource, title = ""): FlavorMarkId[] {
  const pinned = sanitizeFlavorMarks(source.icons ? [...source.icons] : []);
  if (pinned.length) return pinned;

  const named = scanFlavorMarks(title.trim() || source.name || "").filter((id) => id !== "oat");
  if (named.length) return named.slice(0, 3);

  const extras = scanFlavorMarks(`${source.name ?? ""} ${source.addIns ?? ""}`).filter((id) => id !== "oat");
  return extras.slice(0, 3);
}
