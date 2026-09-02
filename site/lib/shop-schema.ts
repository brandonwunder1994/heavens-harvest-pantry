import {
  defaultShop,
  type BlessingBag,
  type Delivery,
  type Flavor,
  type JarRules,
  type RewardRules,
  type Shop,
  type Verse,
} from "@/lib/content";

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
    cleaned.push({
      slug,
      name,
      blurb: text(f.blurb, "", limits.blurb),
      ingredients: text(f.ingredients),
      allergens: text(f.allergens),
      bagPrice: price(f.bagPrice, 0),
      jarPrice: price(f.jarPrice, 0),
      soldOut,
      backOn: soldOut ? text(f.backOn, "", limits.day) || undefined : undefined,
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
    dropOff: text(d.dropOff, defaultShop.delivery.dropOff, limits.name),
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

/** Her saved rows laid over the defaults, one block at a time. */
export function mergeShop(saved: Map<string, unknown>): Shop {
  const shop: Shop = {
    flavors: mergeFlavors(saved.get("flavors")),
    jarRules: mergeJarRules(saved.get("jarRules")),
    rewards: mergeRewards(saved.get("rewards")),
    blessingBag: mergeBlessingBag(saved.get("blessingBag")),
    delivery: mergeDelivery(saved.get("delivery")),
    verseOfTheWeek: mergeVerse(saved.get("verseOfTheWeek"), defaultShop.verseOfTheWeek),
    verses: mergeVerses(saved.get("verses")),
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
  }
}

function checkFlavors(value: unknown): Check {
  if (!Array.isArray(value) || value.length === 0) {
    return bad("That would leave nothing on the menu. Tick sold out instead of removing your last flavor.");
  }

  const seen = new Set<string>();
  for (const raw of value) {
    const f = asObject(raw);
    const name = typeof f.name === "string" ? f.name.trim() : "";
    if (!name) return bad("One of the flavors has no name. Give it one, or remove that box.");
    if (name.length > limits.name) return bad(`"${name.slice(0, 30)}…" is too long a name. Keep it under ${limits.name} letters.`);

    const slug = slugify(name);
    if (!slug) return bad(`"${name}" needs at least one letter or number in its name.`);
    if (seen.has(slug)) return bad(`Two flavors are both called "${name}". They need different names.`);
    seen.add(slug);

    for (const [label, raw2] of [
      ["bag", f.bagPrice],
      ["jar", f.jarPrice],
    ] as const) {
      const n = Number(raw2);
      if (!Number.isFinite(n) || n <= 0) {
        return bad(`${name} has no ${label} price. Every flavor needs one, or it sells for nothing.`);
      }
      if (n > 999) return bad(`${name}'s ${label} price looks like a slip. Keep it under $999.`);
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

function checkBlessingBag(value: unknown): Check {
  const b = asObject(value);
  const n = Number(b.price);
  if (!Number.isFinite(n) || n <= 0) return bad("A blessing bag needs a price, or it costs nothing to send one.");
  if (n > 999) return bad("That blessing bag price looks like a slip. Keep it under $999.");
  return good;
}
