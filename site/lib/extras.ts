import type { Flavor } from "@/lib/content";
import { extrasPickupDays, todayAZ, type PickupPeriod } from "@/lib/fulfilment";

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
/**
 * The days and half-days she can be home for extras pickups, as real dates.
 * She ticks weekdays on the owner page and each one becomes its next date,
 * so a holiday week can run Monday to Wednesday instead of Friday and Saturday.
 * An empty list means "the usual": today until that weekend, morning or afternoon.
 */
export type ExtraPickup = { date: string; morning: boolean; afternoon: boolean };
export type ExtrasSetting = { open: boolean; weekend: string; note: string; items: ExtraItem[]; pickups: ExtraPickup[] };

/** An item with the live numbers a customer page needs. */
export type ExtraLive = ExtraItem & { key: string; name: string; remaining: number };
export type ExtrasState = { weekend: string; note: string; items: ExtraLive[]; pickups: ExtraPickup[] };

export const noExtras: ExtrasSetting = { open: false, weekend: "", note: "", items: [], pickups: [] };

/** How far ahead she can offer extras pickups: today and the six days after it. */
export const EXTRA_PICKUP_WINDOW = 7;

/** The next seven dates starting today, "2026-11-23" first: one checkbox each on the owner page. */
export function extraPickupChoices(now = Date.now()): string[] {
  const start = new Date(`${todayAZ(now)}T12:00:00Z`);
  return Array.from({ length: EXTRA_PICKUP_WINDOW }, (_, n) => {
    const d = new Date(start); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
  });
}

/** The pickups customers can choose from today on: what she picked, or the usual days if she picked none. */
export function extrasPickups(setting: Pick<ExtrasSetting, "weekend" | "pickups">, now = Date.now()): ExtraPickup[] {
  const today = todayAZ(now);
  const chosen = setting.pickups?.length ? setting.pickups : /^\d{4}-\d{2}-\d{2}$/.test(setting.weekend) ? extrasPickupDays(setting.weekend, now).map(date => ({ date, morning: true, afternoon: true })) : [];
  return chosen.filter(p => p.date >= today && (p.morning || p.afternoon));
}

/** True when that date and half-day is one she offered. */
export const extrasPickupAllowed = (pickups: ExtraPickup[], date: string, period: unknown) =>
  (period === "morning" || period === "afternoon") && pickups.some(p => p.date === date && p[period as PickupPeriod]);

/** The last day anyone can pick up, or "" when there is none. */
export function lastExtrasPickup(setting: Pick<ExtrasSetting, "weekend" | "pickups">, now = Date.now()): string {
  return extrasPickups(setting, now).map(p => p.date).sort().at(-1) ?? "";
}

/**
 * Whether a saved list still belongs to the run in progress: the same weekend,
 * or pickups that have not finished yet. A run that spills past Saturday keeps
 * its counts, so re-saving on Sunday cannot let the same bag sell twice.
 */
export function extrasStillRunning(setting: ExtrasSetting, now = Date.now()): boolean {
  if (!setting.weekend) return false;
  return setting.weekend === weekendFor(now) || (setting.items.length > 0 && lastExtrasPickup(setting, now) !== "");
}

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

/** Extras stay up until the end of the last pickup day she offered, then close on their own. */
export function extrasAreOpen(setting: ExtrasSetting, now = Date.now()): boolean {
  if (!setting.open || !/^\d{4}-\d{2}-\d{2}$/.test(setting.weekend) || setting.items.length === 0) return false;
  return extrasPickups(setting, now).length > 0;
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
  const dates = new Set<string>();
  const pickups: ExtraPickup[] = [];
  for (const row of (Array.isArray(value.pickups) ? value.pickups : []).slice(0, 14)) {
    const date = String(row?.date ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`)) || dates.has(date)) continue;
    const morning = row?.morning === true, afternoon = row?.afternoon === true;
    if (!morning && !afternoon) continue;
    dates.add(date);
    pickups.push({ date, morning, afternoon });
  }
  pickups.sort((a, b) => a.date.localeCompare(b.date));
  return { open: value.open === true, weekend, note: text(value.note, 300), items, pickups };
}

/** The product the cart and checkout see for one extra. */
export function extraFlavor(base: Flavor, item: ExtraItem, remaining: number): Flavor {
  const price = item.price;
  return {
    ...base,
    slug: extraSlug(base.slug, item.sizeOz),
    name: `${base.name} · ready now`,
    blurb: "Fresh from this week's bake, ready for pickup on the days shown.",
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
  return { state: { weekend: setting.weekend, note: setting.note, items, pickups: extrasPickups(setting, now) }, flavors: sellable };
}
