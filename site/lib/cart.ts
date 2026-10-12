import { cleanName } from "@/lib/blend";
import type { Flavor, Shop } from "@/lib/content";
import { cleanOmissions, omissionLabel, sizeLabel, type Omission, type SizeOz } from "@/lib/products";
import { REWARDS_ENABLED } from "@/lib/features";

/**
 * Every function here takes the live shop rather than importing fixed prices,
 * because the owner edits her prices from her own page now. Nothing in this
 * file reaches for a global, which is what keeps it testable and what stops a
 * stale price ever reaching the till.
 */

export type Format = "jar" | "bag" | "sampler";

export type CartLine = {
  sizeOz?: SizeOz;
  omissions?: Omission[];
  gift?: { id: string; recipientName: string; address: string; inVistancia: boolean; verseRef?: string; verseNote?: string };
  slug: string;
  format: Format;
  qty: number;
  /**
   * A name to go on the label of this jar, if somebody asked for one.
   *
   * It changes nothing about the price. What it does change is which line this
   * is: two jars of the same flavour with two different names are two things
   * she has to make, not one thing twice.
   */
  name?: string;
};

export type OrderOptions = {
  jarsReturned: number;
  blessingBags: number;
  blessingGiftJars?: number;
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
  blessingGiftJars: number;
  giftJarCents: number;
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
/** Existing gift-jar add-on price, shared with the Stripe line item. */
export const GIFT_JAR_CENTS = 200;

export const dollarsToCents = (dollars: number) => Math.round(dollars * 100);
export const blessingSurchargeCents = (shop: Shop) => dollarsToCents(shop.blessingBag.price);

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function findFlavor(shop: Shop, slug: string): Flavor | undefined {
  return shop.flavors.find((f) => f.slug === slug);
}

export function unitPriceCents(flavor: Flavor, format: Format, sizeOz?: SizeOz): number {
  if (sizeOz && flavor.sizePrices) return dollarsToCents(flavor.sizePrices[sizeOz]);
  if (format === "jar") return dollarsToCents(flavor.jarPrice);
  if (format === "sampler") return dollarsToCents(flavor.samplerPrice ?? flavor.bagPrice);
  return dollarsToCents(flavor.bagPrice);
}

export function lineKey(line: Pick<CartLine, "slug" | "format" | "name" | "sizeOz" | "omissions" | "gift">): string {
  const named = cleanName(line.name);
  const base = named ? `${line.slug}:${line.format}:${named}` : `${line.slug}:${line.format}`;
  return `${base}${line.sizeOz ? `:${line.sizeOz}` : ""}${cleanOmissions(line.omissions).length ? `:${cleanOmissions(line.omissions).join(",")}` : ""}${line.gift ? `:gift:${line.gift.id}` : ""}`;
}

export const lineWeight = (line: CartLine) => (line.sizeOz ?? (line.format === "sampler" ? 3 : 16)) * line.qty;
export const orderWeight = (lines: CartLine[]) => lines.reduce((n, line) => n + lineWeight(line), 0);

/** Drops anything that no longer exists or is sold out, and clamps quantities. */
export function sanitizeCart(shop: Shop, lines: CartLine[]): CartLine[] {
  const merged = new Map<string, CartLine>();
  for (const line of lines) {
    if (!line || typeof line !== "object") continue;
    const flavor = findFlavor(shop, line.slug);
    if (!flavor || flavor.soldOut) continue;
    if (line.format !== "jar" && line.format !== "bag" && line.format !== "sampler") continue;
    if (line.sizeOz !== undefined && ![3, 8, 16].includes(line.sizeOz)) continue;
    const qty = Math.floor(Number(line.qty));
    if (!Number.isFinite(qty) || qty < 1) continue;
    const named = cleanName(line.name);
    const key = lineKey({ ...line, name: named });
    const existing = merged.get(key);
    const next = Math.min((existing?.qty ?? 0) + qty, MAX_QTY_PER_LINE);
    merged.set(key, {
      slug: line.slug,
      format: line.format,
      qty: next,
      ...(line.sizeOz ? { sizeOz: line.sizeOz } : {}),
      ...(cleanOmissions(line.omissions).length ? { omissions: cleanOmissions(line.omissions).filter(o => flavor.allowedOmissions?.includes(o)) } : {}),
      ...(line.gift ? { gift: { id: String(line.gift.id).slice(0, 80), recipientName: String(line.gift.recipientName ?? "").trim().slice(0, 80), address: String(line.gift.address ?? "").trim().slice(0, 250), inVistancia: line.gift.inVistancia === true, verseRef: String(line.gift.verseRef ?? "").slice(0, 60), verseNote: String(line.gift.verseNote ?? "").slice(0, 300) } } : {}),
      ...(named ? { name: named } : {}),
    });
  }
  return [...merged.values()];
}

export function priceOrder(shop: Shop, lines: CartLine[], options: OrderOptions): Totals {
  const clean = sanitizeCart(shop, lines);

  const priced: PricedLine[] = clean.map((line) => {
    const flavor = findFlavor(shop, line.slug)!;
    const unitCents = unitPriceCents(flavor, line.format, line.sizeOz) + (line.gift ? blessingSurchargeCents(shop) : 0);
    return { line, flavor, unitCents, totalCents: unitCents * line.qty };
  });

  const itemCount = priced.reduce((n, p) => n + p.line.qty, 0);
  const subtotalCents = priced.reduce((n, p) => n + p.totalCents, 0);

  const blessingBags = clamp(options.blessingBags, 0, MAX_BLESSING_BAGS);
  const blessingCents = blessingBags * dollarsToCents(shop.blessingBag.price);
  const blessingGiftJars = clamp(options.blessingGiftJars ?? 0, 0, blessingBags);
  const giftJarCents = blessingGiftJars * GIFT_JAR_CENTS;

  const jarsReturned = clamp(options.jarsReturned, 0, MAX_JARS_RETURNED);
  const jarCreditRequestedCents = jarsReturned * dollarsToCents(shop.jarRules.creditDollars);

  const beforeCredit = subtotalCents + blessingCents + giftJarCents;
  // Credit can wipe out most of an order but never all of it, or there would be
  // nothing to charge. Any jars it cannot pay for still earn their points.
  const room = Math.max(0, beforeCredit - MINIMUM_CHARGE_CENTS);
  const jarCreditAppliedCents = Math.min(jarCreditRequestedCents, room);

  const totalCents = beforeCredit - jarCreditAppliedCents;

  const points = REWARDS_ENABLED ?
    Math.floor((beforeCredit / 100) * shop.rewards.pointsPerDollar) +
    jarsReturned * shop.jarRules.bonusPoints : 0;

  return {
    lines: priced,
    itemCount,
    jarsReturned,
    blessingBags,
    subtotalCents,
    blessingCents,
    blessingGiftJars,
    giftJarCents,
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
  const named = p.line.name ? ` for ${p.line.name}` : "";
  const format = p.line.sizeOz ? `${sizeLabel(p.line.sizeOz)} ${p.line.gift ? "blessing jar" : "bag"}` : p.line.format === "sampler" ? "3 oz sampler bag" : p.line.format;
  const omissions = cleanOmissions(p.line.omissions).map(o => omissionLabel[o]).join(", ");
  return `${p.flavor.name}${named}, ${format}${p.line.qty > 1 ? ` ×${p.line.qty}` : ""}${omissions ? ` · ${omissions}` : ""}${p.line.gift ? ` · for ${p.line.gift.recipientName}` : ""}`;
}
