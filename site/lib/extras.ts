import type { Flavor } from "@/lib/content";
import { saturdayDate } from "@/lib/fulfilment";

/**
 * "Extras": the bags left over after the weekend's bake, posted on Instagram
 * Thursday night and sold for immediate pickup at a discount.
 *
 * Each extra is a normal product line to the cart and to Stripe, with a name
 * like "Maple Pecan · ready now" and its own price. What makes it different is
 * a stock count she sets, which the site counts down as people pay, so it can
 * never sell more than she has. Pure rules live here; the database counting
 * lives in lib/extras-store.ts.
 */

export type ExtraSize = 3 | 8 | 16;
export const EXTRA_SIZES: readonly ExtraSize[] = [3, 8, 16];

/** What she saves. `qty` is the total she has to sell; the site subtracts what has been claimed. */
export type ExtraItem = { slug: string; sizeOz: ExtraSize; qty: number; price: number; setAt: string };
export type ExtrasSetting = { open: boolean; weekend: string; note: string; items: ExtraItem[] };

/** An item with the live numbers a customer page needs. */
export type ExtraLive = ExtraItem & { key: string; name: string; remaining: number };
export type ExtrasState = { weekend: string; note: string; items: ExtraLive[] };

export const noExtras: ExtrasSetting = { open: false, weekend: "", note: "", items: [] };

export const extraSlug = (slug: string, size: number) => `extra-${slug}-${size}`;
export const isExtraSlug = (slug: unknown): slug is string => typeof slug === "string" && slug.startsWith("extra-");

/** "extra-maple-pecan-8" becomes { slug: "maple-pecan", sizeOz: 8 }. */
export function baseOfExtra(extra: string): { slug: string; sizeOz: ExtraSize } | null {
  const match = /^extra-(.+)-(3|8|16)$/.exec(extra);
  return match ? { slug: match[1], sizeOz: Number(match[2]) as ExtraSize } : null;
}

const phoenix = (now: number) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(now));
  const part = (type: string) => Number(parts.find(p => p.type === type)?.value);
  return new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
};

/** The Friday of the weekend that includes today: today if Friday, yesterday if Saturday, else the coming Friday. */
export function weekendFor(now = Date.now()): string {
  const date = phoenix(now);
  const day = date.getUTCDay();
  const delta = day === 6 ? -1 : (5 - day + 7) % 7;
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

/** Extras stay up until the end of that Saturday, then close on their own. */
export function extrasAreOpen(setting: ExtrasSetting, now = Date.now()): boolean {
  if (!setting.open || !/^\d{4}-\d{2}-\d{2}$/.test(setting.weekend) || setting.items.length === 0) return false;
  const today = phoenix(now).toISOString().slice(0, 10);
  return today <= saturdayDate(setting.weekend);
}

const text = (value: unknown, max: number) => String(value ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

export function cleanExtras(raw: unknown, now = Date.now()): ExtrasSetting {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<ExtrasSetting>;
  const seen = new Set<string>();
  const items: ExtraItem[] = [];
  for (const row of (Array.isArray(value.items) ? value.items : []).slice(0, 40)) {
    const slug = text(row?.slug, 80);
    const sizeOz = Number(row?.sizeOz) as ExtraSize;
    const price = Math.round(Number(row?.price) * 100) / 100;
    const qty = Math.floor(Number(row?.qty));
    if (!slug || !EXTRA_SIZES.includes(sizeOz) || !Number.isFinite(price) || price < 0.5 || price > 999 || !Number.isFinite(qty) || qty < 0 || qty > 500) continue;
    const key = extraSlug(slug, sizeOz);
    if (seen.has(key)) continue;
    seen.add(key);
    const setAt = typeof row.setAt === "string" && !Number.isNaN(Date.parse(row.setAt)) ? new Date(row.setAt).toISOString() : new Date(now).toISOString();
    items.push({ slug, sizeOz, qty, price, setAt });
  }
  const weekend = /^\d{4}-\d{2}-\d{2}$/.test(String(value.weekend)) ? String(value.weekend) : weekendFor(now);
  return { open: value.open === true, weekend, note: text(value.note, 300), items };
}

/** The product the cart and checkout see for one extra. */
export function extraFlavor(base: Flavor, item: ExtraItem, remaining: number): Flavor {
  const price = item.price;
  return {
    ...base,
    slug: extraSlug(base.slug, item.sizeOz),
    name: `${base.name} · ready now`,
    blurb: "Fresh from this weekend's bake, ready for pickup right away.",
    sizePrices: { 3: price, 8: price, 16: price },
    bagPrice: price,
    jarPrice: price,
    samplerPrice: price,
    soldOut: remaining <= 0,
    backOn: undefined,
    allowedOmissions: [],
    variants: undefined,
    variantLabel: undefined,
  };
}

/** Everything a page needs to show and sell this weekend's extras, or undefined when there are none. */
export function liveExtras(setting: ExtrasSetting, flavors: Flavor[], claimed: Map<string, number>, now = Date.now()): { state: ExtrasState; flavors: Flavor[] } | undefined {
  if (!extrasAreOpen(setting, now)) return undefined;
  const items: ExtraLive[] = [];
  const sellable: Flavor[] = [];
  for (const item of setting.items) {
    const base = flavors.find(f => f.slug === item.slug);
    if (!base) continue;
    const key = extraSlug(item.slug, item.sizeOz);
    const remaining = Math.max(0, item.qty - (claimed.get(key) ?? 0));
    const flavor = extraFlavor(base, item, remaining);
    sellable.push(flavor);
    items.push({ ...item, key, name: flavor.name, remaining });
  }
  if (!items.length) return undefined;
  return { state: { weekend: setting.weekend, note: setting.note, items }, flavors: sellable };
}
