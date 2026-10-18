/**
 * What it costs to make a bag of granola.
 *
 * She types in what she pays for an ingredient ("2 lb of cashews for $18") and
 * what goes into a batch ("12 oz of cashews"). Everything else, the cost per
 * ounce, per bag, and the profit on each size, is worked out here and never
 * stored, so a price change shows up everywhere at once.
 *
 * Pure arithmetic with no database or framework, so a test can check it.
 */

export type Unit = "oz" | "lb" | "each";
export type SizeKey = "3" | "8" | "16";
export const SIZE_KEYS: readonly SizeKey[] = ["3", "8", "16"];

/** One thing she buys: a bag of oats, a roll of stickers, a box of bags. */
export type Ingredient = { id: string; name: string; unit: Unit; packQty: number; packPrice: number };
/** `amount` is in ounces for oz/lb ingredients and in pieces for "each". */
export type RecipeLine = { ingredientId: string; amount: number };
/** A batch: what goes in, and how many ounces of finished granola it makes. */
export type Recipe = { yieldOz: number; lines: RecipeLine[] };

export type Costs = {
  ingredients: Ingredient[];
  recipes: Record<string, Recipe>;
  /** What goes with every bag of that size: the bag itself, the sticker. */
  packaging: Record<SizeKey, RecipeLine[]>;
  /** Card fee, as a percent of each order plus a flat amount per order. */
  feePercent: number;
  feeFixed: number;
};

export const emptyCosts = (): Costs => ({
  ingredients: [],
  recipes: {},
  packaging: { "3": [], "8": [], "16": [] },
  feePercent: 2.9,
  feeFixed: 0.3,
});

const num = (value: unknown, min: number, max: number, fallback = 0): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const text = (value: unknown, max: number) => String(value ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

function cleanLines(raw: unknown, known: Set<string>): RecipeLine[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: RecipeLine[] = [];
  for (const row of raw.slice(0, 60)) {
    const ingredientId = text((row as RecipeLine)?.ingredientId, 40);
    if (!known.has(ingredientId) || seen.has(ingredientId)) continue;
    seen.add(ingredientId);
    out.push({ ingredientId, amount: num((row as RecipeLine).amount, 0, 100000) });
  }
  return out;
}

/** Whatever came off the wire or out of the database, made safe to use. */
export function cleanCosts(raw: unknown): Costs {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<Costs>;
  const ingredients: Ingredient[] = [];
  const ids = new Set<string>();
  for (const row of (Array.isArray(value.ingredients) ? value.ingredients : []).slice(0, 120)) {
    const id = text(row?.id, 40).replace(/[^a-zA-Z0-9_-]/g, "");
    const name = text(row?.name, 80);
    if (!id || !name || ids.has(id)) continue;
    ids.add(id);
    ingredients.push({
      id,
      name,
      unit: row.unit === "lb" || row.unit === "each" ? row.unit : "oz",
      packQty: num(row.packQty, 0, 1000000),
      packPrice: num(row.packPrice, 0, 1000000),
    });
  }
  const recipes: Record<string, Recipe> = {};
  const source = value.recipes && typeof value.recipes === "object" ? value.recipes : {};
  for (const slug of Object.keys(source).slice(0, 60)) {
    const r = source[slug];
    recipes[text(slug, 80)] = { yieldOz: num(r?.yieldOz, 0, 100000), lines: cleanLines(r?.lines, ids) };
  }
  const pack = (value.packaging ?? {}) as Partial<Record<SizeKey, unknown>>;
  return {
    ingredients,
    recipes,
    packaging: { "3": cleanLines(pack["3"], ids), "8": cleanLines(pack["8"], ids), "16": cleanLines(pack["16"], ids) },
    feePercent: num(value.feePercent, 0, 20, 2.9),
    feeFixed: num(value.feeFixed, 0, 5, 0.3),
  };
}

/** Dollars per ounce (or per piece, for "each"). Zero if she has not said what a pack holds. */
export function unitCost(ingredient: Ingredient): number {
  const qty = ingredient.unit === "lb" ? ingredient.packQty * 16 : ingredient.packQty;
  return qty > 0 ? ingredient.packPrice / qty : 0;
}

const byId = (costs: Costs) => new Map(costs.ingredients.map(i => [i.id, i] as const));

export const linesCost = (costs: Costs, lines: RecipeLine[]): number => {
  const map = byId(costs);
  return lines.reduce((sum, l) => sum + (map.has(l.ingredientId) ? unitCost(map.get(l.ingredientId)!) * l.amount : 0), 0);
};

/** What one whole batch costs in ingredients. */
export const batchCost = (costs: Costs, slug: string): number => linesCost(costs, costs.recipes[slug]?.lines ?? []);

/** Ingredient cost of one ounce of finished granola, or null if the recipe is not filled in. */
export function costPerOz(costs: Costs, slug: string): number | null {
  const recipe = costs.recipes[slug];
  if (!recipe || recipe.yieldOz <= 0 || recipe.lines.length === 0) return null;
  return batchCost(costs, slug) / recipe.yieldOz;
}

export const packagingCost = (costs: Costs, size: number): number => linesCost(costs, costs.packaging[String(size) as SizeKey] ?? []);

export type BagCost = { ingredients: number; packaging: number; total: number };

/** The cost to make one bag of this flavor and size, or null when no recipe has been entered. */
export function bagCost(costs: Costs, slug: string, size: number): BagCost | null {
  const perOz = costPerOz(costs, slug);
  if (perOz === null) return null;
  const ingredients = perOz * size;
  const packaging = packagingCost(costs, size);
  return { ingredients, packaging, total: ingredients + packaging };
}

export type Margin = { cost: number; price: number; profit: number; marginPct: number };

/** Profit on one bag after ingredients, packaging and the card fee. */
export function bagMargin(costs: Costs, slug: string, size: number, price: number): Margin | null {
  const cost = bagCost(costs, slug, size);
  if (!cost) return null;
  const fee = price * (costs.feePercent / 100);
  const total = cost.total + fee;
  const profit = price - total;
  return { cost: total, price, profit, marginPct: price > 0 ? (profit / price) * 100 : 0 };
}

export type SoldLine = { slug: string; sizeOz: number; qty: number; priceEach: number };

export type Rollup = { revenue: number; cost: number; fees: number; profit: number; unknownBags: number };

/** Revenue, cost and profit for a pile of sold bags. Bags with no recipe are counted, not guessed. */
export function rollup(costs: Costs, sold: SoldLine[], orderCount: number): Rollup {
  let revenue = 0, cost = 0, unknownBags = 0;
  for (const s of sold) {
    revenue += s.priceEach * s.qty;
    const c = bagCost(costs, s.slug, s.sizeOz);
    if (c) cost += c.total * s.qty; else unknownBags += s.qty;
  }
  const fees = revenue * (costs.feePercent / 100) + orderCount * costs.feeFixed;
  return { revenue, cost, fees, profit: revenue - cost - fees, unknownBags };
}

export const dollars = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toFixed(2)}`;
