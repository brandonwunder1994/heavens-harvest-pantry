import type { Flavor, Shop } from "@/lib/content";

/**
 * Every function here takes the live shop rather than importing fixed prices,
 * because the owner edits her prices from her own page now. Nothing in this
 * file reaches for a global, which is what keeps it testable and what stops a
 * stale price ever reaching the till.
 */

export type Format = "jar" | "bag";

export type CartLine = {
  slug: string;
  format: Format;
  qty: number;
};

export type OrderOptions = {
  jarsReturned: number;
  blessingBags: number;
};

export type PricedLine = {
  line: CartLine;
  flavor: Flavor;
  unitCents: number;
  totalCents: number;
};

export type Totals = {
  lines: PricedLine[];
  itemCount: number;
  /**
   * The quantities the totals below were actually worked out from, after every
   * clamp. Anything that charges, records or reports an order must use THESE
   * and never the raw numbers the browser sent, or the amount shown and the
   * amount charged can part company.
   */
  jarsReturned: number;
  blessingBags: number;
  subtotalCents: number;
  blessingCents: number;
  /** What the customer asked for: jars returned times the credit. */
  jarCreditRequestedCents: number;
  /** What actually comes off this order, after the minimum-charge floor. */
  jarCreditAppliedCents: number;
  totalCents: number;
  points: number;
};

/** Stripe cannot charge nothing, so an order never falls below this. */
export const MINIMUM_CHARGE_CENTS = 100;
export const MAX_JARS_RETURNED = 12;
export const MAX_BLESSING_BAGS = 20;
export const MAX_QTY_PER_LINE = 20;

export const dollarsToCents = (dollars: number) => Math.round(dollars * 100);

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function findFlavor(shop: Shop, slug: string): Flavor | undefined {
  return shop.flavors.find((f) => f.slug === slug);
}

export function unitPriceCents(flavor: Flavor, format: Format): number {
  return dollarsToCents(format === "jar" ? flavor.jarPrice : flavor.bagPrice);
}

export function lineKey(line: Pick<CartLine, "slug" | "format">): string {
  return `${line.slug}:${line.format}`;
}

/** Drops anything that no longer exists or is sold out, and clamps quantities. */
export function sanitizeCart(shop: Shop, lines: CartLine[]): CartLine[] {
  const merged = new Map<string, CartLine>();
  for (const line of lines) {
    const flavor = findFlavor(shop, line.slug);
    if (!flavor || flavor.soldOut) continue;
    if (line.format !== "jar" && line.format !== "bag") continue;
    const qty = Math.floor(Number(line.qty));
    if (!Number.isFinite(qty) || qty < 1) continue;
    const key = lineKey(line);
    const existing = merged.get(key);
    const next = Math.min((existing?.qty ?? 0) + qty, MAX_QTY_PER_LINE);
    merged.set(key, { slug: line.slug, format: line.format, qty: next });
  }
  return [...merged.values()];
}

export function priceOrder(shop: Shop, lines: CartLine[], options: OrderOptions): Totals {
  const clean = sanitizeCart(shop, lines);

  const priced: PricedLine[] = clean.map((line) => {
    const flavor = findFlavor(shop, line.slug)!;
    const unitCents = unitPriceCents(flavor, line.format);
    return { line, flavor, unitCents, totalCents: unitCents * line.qty };
  });

  const itemCount = priced.reduce((n, p) => n + p.line.qty, 0);
  const subtotalCents = priced.reduce((n, p) => n + p.totalCents, 0);

  const blessingBags = clamp(options.blessingBags, 0, MAX_BLESSING_BAGS);
  const blessingCents = blessingBags * dollarsToCents(shop.blessingBag.price);

  const jarsReturned = clamp(options.jarsReturned, 0, MAX_JARS_RETURNED);
  const jarCreditRequestedCents = jarsReturned * dollarsToCents(shop.jarRules.creditDollars);

  const beforeCredit = subtotalCents + blessingCents;
  // Credit can wipe out most of an order but never all of it, or there would be
  // nothing to charge. Any jars it cannot pay for still earn their points.
  const room = Math.max(0, beforeCredit - MINIMUM_CHARGE_CENTS);
  const jarCreditAppliedCents = Math.min(jarCreditRequestedCents, room);

  const totalCents = beforeCredit - jarCreditAppliedCents;

  const points =
    Math.floor((beforeCredit / 100) * shop.rewards.pointsPerDollar) +
    jarsReturned * shop.jarRules.bonusPoints;

  return {
    lines: priced,
    itemCount,
    jarsReturned,
    blessingBags,
    subtotalCents,
    blessingCents,
    jarCreditRequestedCents,
    jarCreditAppliedCents,
    totalCents,
    points,
  };
}

function clamp(value: number, min: number, max: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

export function describeLine(p: PricedLine): string {
  return `${p.flavor.name}, ${p.line.format}${p.line.qty > 1 ? ` ×${p.line.qty}` : ""}`;
}
