import { noPorch, type Porch } from "@/lib/porch";
import {
  defaultLabelSettings,
  defaultShop,
  type BlessingBag,
  type Delivery,
  type Flavor,
  type LabelSettings,
  type LabelSize,
  type LabelTemplate,
  type JarRules,
  type RewardRules,
  type Shop,
  type Verse,
} from "@/lib/content";
import { sanitizeFlavorMarks } from "@/lib/flavor-marks";
import { cleanOmissions } from "@/lib/products";

/**
 * Reading her saved settings back, and checking what she is about to save.
 *
 * Two different jobs on purpose, with two different attitudes:
 *
 * - **Merging** is forgiving. Whatever is already in the database has to render
 *   something sensible on a customer's screen, so a bad block falls back to the
 *   built-in default for that block alone and the shop stays up.
 * - **Validating** is strict. A save that would leave her with no flavors, a
 *   free bag, or two flavors sharing a name is refused and told to her in plain
 *   words. It must never be quietly turned into the sample data and reported as
 *   "Saved" — she has no way of knowing, and there is no undo.
 *
 * Import-free apart from the defaults, so `node --test` runs it directly.
 */

export const editableKeys = [
  "flavors",
  "jarRules",
  "rewards",
  "blessingBag",
  "delivery",
  "verseOfTheWeek",
  "verses",
  "porch",
  "labelTemplates",
] as const;

export type EditableKey = (typeof editableKeys)[number];

export const isEditableKey = (key: string): key is EditableKey =>
  (editableKeys as readonly string[]).includes(key);

/** Longest anything she types may be, so it cannot break a Stripe receipt. */
export const limits = {
  name: 80,
  area: 60,
  day: 40,
  date: 40,
  blurb: 300,
  prose: 600,
  verse: 600,
  reference: 60,
  porchNote: 64,
  addIns: 160,
  netWeight: 80,
  tracker: 32,
  qrUrl: 200,
} as const;

// ---------------------------------------------------------------- merging

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const text = (value: unknown, fallback = "", max: number = limits.prose): string =>
  typeof value === "string" ? value.slice(0, max) : fallback;

const price = (value: unknown, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : fallback;
};

const count = (value: unknown, fallback: number, min = 0): number => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= min ? n : fallback;
};

export function mergeVerse(value: unknown, fallback: Verse): Verse {
  const v = asObject(value);
  const merged = {
    text: text(v.text, fallback.text, limits.verse),
    reference: text(v.reference, fallback.reference, limits.reference),
  };
  return merged.text.trim() ? merged : fallback;
}

export function mergeVerses(value: unknown): Record<string, Verse> {
  const merged: Record<string, Verse> = { ...defaultShop.verses };
  for (const [slot, raw] of Object.entries(asObject(value))) {
    merged[slot] = mergeVerse(raw, merged[slot] ?? { text: "", reference: "" });
  }
  return merged;
}

export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function mergeFlavors(value: unknown): Flavor[] {
  if (!Array.isArray(value)) return defaultShop.flavors;

  const seen = new Set<string>();
  const cleaned: Flavor[] = [];

  for (const raw of value) {
    const f = asObject(raw);
    const name = text(f.name, "", limits.name).trim();
    const slug = (text(f.slug, "", limits.name).trim() || slugify(name)).slice(0, limits.name);
    // A flavor with no name, or one sharing another's web address, cannot be
    // sold: the second would be priced as the first. Drop it rather than guess.
    if (!name || !slug || seen.has(slug)) continue;
    seen.add(slug);

    const soldOut = Boolean(f.soldOut);
    const icons = sanitizeFlavorMarks(f.icons);
    cleaned.push({
      slug,
      name,
      blurb: text(f.blurb, "", limits.blurb),
      ingredients: text(f.ingredients),
      allergens: text(f.allergens),
      addIns: text(f.addIns, "", limits.addIns),
      bagPrice: f.sizePrices ? price(asObject(f.sizePrices)[16], price(f.bagPrice, 0)) : price(f.bagPrice, 0),
      jarPrice: f.sizePrices ? price(asObject(f.sizePrices)[16], price(f.bagPrice, 0)) : price(f.jarPrice, 0),
      samplerPrice: f.sizePrices ? price(asObject(f.sizePrices)[3], price(f.samplerPrice, 5)) : price(f.samplerPrice, price(f.bagPrice, 0)),
      ...(f.sizePrices ? { sizePrices: { 3: price(asObject(f.sizePrices)[3], price(f.samplerPrice, 5)), 8: price(asObject(f.sizePrices)[8], 10), 16: price(asObject(f.sizePrices)[16], price(f.bagPrice, 16)) } } : {}),
      allowedOmissions: cleanOmissions(f.allowedOmissions),
      requiresCooling: f.requiresCooling === true,
      category: f.category === "almonds" ? "almonds" : "granola",
      soldOut,
      backOn: soldOut ? text(f.backOn, "", limits.day) || undefined : undefined,
      ...(icons.length ? { icons } : {}),
    });
  }

  // An empty list would leave nothing to sell, which is never what she meant.
  return cleaned.length > 0 ? cleaned : defaultShop.flavors;
}

export function mergeDelivery(value: unknown): Delivery {
  const d = asObject(value);
  const runs = Array.isArray(d.runs)
    ? d.runs
        .map((raw) => {
          const r = asObject(raw);
          return {
            area: text(r.area, "", limits.area).trim(),
            day: text(r.day, "", limits.day),
            nextDate: text(r.nextDate, "", limits.date),
          };
        })
        .filter((r) => r.area)
    : [];

  return {
    cutoff: text(d.cutoff, defaultShop.delivery.cutoff, limits.name),
    bakeDay: text(d.bakeDay, defaultShop.delivery.bakeDay, limits.day),
    dropOff: "Vistancia",
    runs: runs.length > 0 ? runs : defaultShop.delivery.runs,
  };
}

export function mergeJarRules(value: unknown): JarRules {
  const j = asObject(value);
  return {
    creditDollars: price(j.creditDollars, defaultShop.jarRules.creditDollars),
    bonusPoints: count(j.bonusPoints, defaultShop.jarRules.bonusPoints),
    bagSize: text(j.bagSize, defaultShop.jarRules.bagSize, limits.name),
    jarSize: text(j.jarSize, defaultShop.jarRules.jarSize, limits.name),
  };
}

export function mergeRewards(value: unknown): RewardRules {
  const r = asObject(value);
  return {
    pointsPerDollar: count(r.pointsPerDollar, defaultShop.rewards.pointsPerDollar),
    // A free bag at zero would divide the customer's progress bar by nothing.
    rewardAt: count(r.rewardAt, defaultShop.rewards.rewardAt, 1),
    welcomeBonus: count(r.welcomeBonus, defaultShop.rewards.welcomeBonus),
    referralCredit: price(r.referralCredit, defaultShop.rewards.referralCredit),
  };
}

export function mergeBlessingBag(value: unknown): BlessingBag {
  const b = asObject(value);
  return {
    price: price(b.price, defaultShop.blessingBag.price),
    blurb: text(b.blurb, defaultShop.blessingBag.blurb),
  };
}

/**
 * The porch light. Her note is hers, shown as written, but it has to fit on one
 * line at the top of every page, and a garbled timestamp must read as "she has
 * never flipped it" rather than as a lamp of unknown age.
 */
export function mergePorch(value: unknown): Porch {
  const p = asObject(value);
  const lit = typeof p.lit === "boolean" ? p.lit : null;
  const flippedAt = typeof p.flippedAt === "string" && !Number.isNaN(Date.parse(p.flippedAt))
    ? p.flippedAt
    : null;

  if (lit === null || !flippedAt) return noPorch;
  return { lit, note: text(p.note, "", limits.porchNote), flippedAt };
}

const asSize = (value: unknown, fallback: LabelSize): LabelSize =>
  value === "jar" || value === "bag" ? value : fallback;

export function mergeLabelTemplates(value: unknown): LabelSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultLabelSettings;
  }

  const v = asObject(value);
  const scripture = mergeVerse(v.scripture, defaultLabelSettings.scripture);
  const qrUrl = text(v.qrUrl, defaultLabelSettings.qrUrl, limits.qrUrl).trim() || defaultLabelSettings.qrUrl;

  const seen = new Set<string>();
  const templates: LabelTemplate[] = [];
  if (Array.isArray(v.templates)) {
    for (const raw of v.templates) {
      const t = asObject(raw);
      const flavorSlug = text(t.flavorSlug, "", limits.name).trim();
      const title = text(t.title, "", limits.name).trim();
      if (!flavorSlug || !title || seen.has(flavorSlug)) continue;
      seen.add(flavorSlug);
      const size = asSize(t.size, "bag");
      templates.push({
        flavorSlug,
        title,
        ingredients: text(t.ingredients),
        allergens: text(t.allergens),
        scripture: mergeVerse(t.scripture, scripture),
        netWeight: text(t.netWeight, size === "jar" ? "Net Wt 16 oz (454 g)" : "Net Wt 12 oz (340 g)", limits.netWeight),
        size,
      });
    }
  }

  return { templates, scripture, qrUrl };
}

/**
 * Her saved rows laid over the defaults, one block at a time.
 *
 * `weekly` is the verse the calendar has chosen for this week. It is passed in
 * rather than imported so this file stays free of runtime-only imports and
 * `node --test` can run it directly. Her own choice, if she has made one,
 * overrides it — she has the last word, but she never has to use it.
 */
export function mergeShop(saved: Map<string, unknown>, weekly?: Verse): Shop {
  const shop: Shop = {
    flavors: mergeFlavors(saved.get("flavors")),
    jarRules: mergeJarRules(saved.get("jarRules")),
    rewards: mergeRewards(saved.get("rewards")),
    blessingBag: mergeBlessingBag(saved.get("blessingBag")),
    delivery: mergeDelivery(saved.get("delivery")),
    verseOfTheWeek: mergeVerse(
      saved.get("verseOfTheWeek"),
      weekly ?? defaultShop.verseOfTheWeek,
    ),
    verses: mergeVerses(saved.get("verses")),
    porch: mergePorch(saved.get("porch")),
    labelTemplates: mergeLabelTemplates(saved.get("labelTemplates")),
  };
  // The hero band always shows this week's card, whichever way she changed it.
  shop.verses = { ...shop.verses, hero: shop.verseOfTheWeek };
  return shop;
}

// -------------------------------------------------------------- validating

export type Check = { ok: true } | { ok: false; problem: string };

const good: Check = { ok: true };
const bad = (problem: string): Check => ({ ok: false, problem });

/**
 * Is this block safe to save? The message is what she reads, so it says what
 * went wrong and what to do instead — never a code, never a field name.
 */
export function checkBlock(key: EditableKey, value: unknown): Check {
  switch (key) {
    case "flavors":
      return checkFlavors(value);
    case "delivery":
      return checkDelivery(value);
    case "verseOfTheWeek":
      return checkVerse(value);
    case "rewards":
      return checkRewards(value);
    case "jarRules":
      return checkJarRules(value);
    case "blessingBag":
      return checkBlessingBag(value);
    case "verses":
      return good;
    case "porch":
      return checkPorch(value);
    case "labelTemplates":
      return checkLabelTemplates(value);
  }
}

function checkFlavors(value: unknown): Check {
  if (!Array.isArray(value) || value.length === 0) {
    return bad("That would leave nothing on the menu. Tick sold out instead of removing your last flavor.");
  }

  const seen = new Set<string>();
  const identifiers = new Set<string>();
  for (const raw of value) {
    const f = asObject(raw);
    const name = typeof f.name === "string" ? f.name.trim() : "";
    if (!name) return bad("One of the flavors has no name. Give it one, or remove that box.");
    if (name.length > limits.name) return bad(`"${name.slice(0, 30)}…" is too long a name. Keep it under ${limits.name} letters.`);

    const slug = slugify(name);
    if (!slug) return bad(`"${name}" needs at least one letter or number in its name.`);
    if (seen.has(slug)) return bad(`Two flavors are both called "${name}". They need different names.`);
    seen.add(slug);
    const productId = text(f.slug, slug, limits.name).trim() || slug;
    if (!/^[a-z0-9-]+$/.test(productId)) return bad(`${name} has an invalid product identifier.`);
    if (identifiers.has(productId)) return bad(`${name} shares a product identifier with another item.`);
    identifiers.add(productId);

    if (!f.sizePrices) for (const [label, raw2] of [
      ["bag", f.bagPrice],
      ["jar", f.jarPrice],
      ["3 oz sampler", f.samplerPrice ?? f.bagPrice],
    ] as const) {
      const n = Number(raw2);
      if (!Number.isFinite(n) || n <= 0) {
        return bad(`${name} has no ${label} price. Every flavor needs one, or it sells for nothing.`);
      }
      if (n > 999) return bad(`${name}'s ${label} price looks like a slip. Keep it under $999.`);
    }
    if (f.sizePrices) for (const size of [3, 8, 16]) {
      const n = Number(asObject(f.sizePrices)[size]);
      if (!Number.isFinite(n) || n < 0.01 || n > 999 || Math.abs(n * 100 - Math.round(n * 100)) > 0.00001) return bad(`${name} needs a price between $0.01 and $999, using cents, for its ${size} oz bag.`);
    }
  }
  return good;
}

function checkDelivery(value: unknown): Check {
  const d = asObject(value);
  if (!Array.isArray(d.runs) || d.runs.length === 0) {
    return bad("You need at least one delivery day, or nobody can place an order.");
  }
  for (const raw of d.runs) {
    const r = asObject(raw);
    const area = typeof r.area === "string" ? r.area.trim() : "";
    if (!area) return bad("One of the delivery days has no neighborhood. Fill it in or remove that box.");
    if (area.length > limits.area) return bad(`"${area.slice(0, 30)}…" is too long a neighborhood name.`);
    if (!(typeof r.nextDate === "string" && r.nextDate.trim())) {
      return bad(`${area} has no next date. Customers pick that date at checkout, so it cannot be blank.`);
    }
  }
  return good;
}

function checkVerse(value: unknown): Check {
  const v = asObject(value);
  const body = typeof v.text === "string" ? v.text.trim() : "";
  if (!body) return bad("The verse is empty. Type the words you want on this week's card.");
  if (body.length > limits.verse) return bad(`That is longer than a card will hold. Keep it under ${limits.verse} letters.`);
  return good;
}

function checkRewards(value: unknown): Check {
  const r = asObject(value);
  if (!(Number(r.rewardAt) >= 1)) return bad("A free bag has to come at one point or more.");
  if (!(Number(r.pointsPerDollar) >= 0)) return bad("Points per dollar cannot be less than nothing.");
  if (!(Number(r.welcomeBonus) >= 0)) return bad("The welcome bonus cannot be less than nothing.");
  if (!(Number(r.referralCredit) >= 0)) return bad("The referral credit cannot be less than nothing.");
  return good;
}

function checkJarRules(value: unknown): Check {
  const j = asObject(value);
  if (!(Number(j.creditDollars) >= 0)) return bad("Money off a returned jar cannot be less than nothing.");
  if (!(Number(j.bonusPoints) >= 0)) return bad("Bonus points cannot be less than nothing.");
  return good;
}

function checkPorch(value: unknown): Check {
  const p = asObject(value);
  if (typeof p.lit !== "boolean") return bad("Choose whether you are baking this week or sold out.");
  if (typeof p.note === "string" && p.note.length > limits.porchNote) {
    return bad(`Those words are too long for the top of the page. Keep them under ${limits.porchNote} letters.`);
  }
  return good;
}

function checkLabelTemplates(value: unknown): Check {
  const v = asObject(value);
  if (!Array.isArray(v.templates)) {
    return bad("The labels could not be read. Try saving again.");
  }

  const seen = new Set<string>();
  for (const raw of v.templates) {
    const t = asObject(raw);
    const title = typeof t.title === "string" ? t.title.trim() : "";
    if (!title) return bad("One of the labels has no granola name. Give it one, or pick a flavor.");
    if (title.length > limits.name) {
      return bad(`"${title.slice(0, 30)}…" is too long a name. Keep it under ${limits.name} letters.`);
    }

    const slug = typeof t.flavorSlug === "string" ? t.flavorSlug.trim() : "";
    if (!slug) return bad(`The label for "${title}" is missing which flavor it belongs to.`);
    if (seen.has(slug)) return bad("Two labels are both for the same flavor. Keep one of each.");
    seen.add(slug);

    if (typeof t.ingredients === "string" && t.ingredients.length > limits.prose) {
      return bad(`The ingredients on ${title} will not fit a label. Keep them under ${limits.prose} letters.`);
    }
    if (typeof t.allergens === "string" && t.allergens.length > limits.prose) {
      return bad(`The allergen line on ${title} will not fit a label. Keep it under ${limits.prose} letters.`);
    }
    if (typeof t.netWeight === "string" && t.netWeight.length > limits.netWeight) {
      return bad(`The net weight on ${title} is too long. Keep it under ${limits.netWeight} letters.`);
    }

    const verse = asObject(t.scripture);
    if (typeof verse.text === "string" && verse.text.trim() === "") {
      return bad(`The verse on ${title} is empty. Type the words you want printed.`);
    }
    if (typeof verse.text === "string" && verse.text.length > limits.verse) {
      return bad(`The verse on ${title} is longer than a label will hold. Keep it under ${limits.verse} letters.`);
    }
  }

  const shared = asObject(v.scripture);
  if (typeof shared.text === "string" && shared.text.trim() === "") {
    return bad("The verse on the label is empty. Type the words you want printed.");
  }

  return good;
}

function checkBlessingBag(value: unknown): Check {
  const b = asObject(value);
  const n = Number(b.price);
  if (!Number.isFinite(n) || n < 0.01) return bad("A blessing bag needs a price, or it costs nothing to send one.");
  if (n > 999) return bad("That blessing bag price looks like a slip. Keep it under $999.");
  if (Math.abs(n * 100 - Math.round(n * 100)) > 0.000001) return bad("Use dollars and cents for the blessing surcharge.");
  return good;
}
