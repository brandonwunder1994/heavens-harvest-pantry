export const ORDER_CUTOFF = "Tuesday at 9 p.m. Arizona time";
export const PICKUP_DAY = "Friday and Saturday";
export const PICKUP_LABEL = "Porch pickup Friday and Saturday";
export const DELIVERY_ENABLED = false;
export const BLESSING_BAGS_ENABLED = true;
export const ORDERS_PAUSED = false;
export function ordersArePaused(): boolean { return ORDERS_PAUSED; }
export const ORDERS_PAUSED_MESSAGE = "Online ordering is temporarily paused. Please check back shortly.";
export const FIRST_PICKUP_DATE = "2026-10-16";
export const CAPACITY_OZ = 768;
export type PickupPeriod = "morning" | "afternoon";
export const ADDRESS_NOTE = "Thanks for keeping our home address between us. It’s just for your pickup. 🙂";
export const storageMessage = (chocolate: boolean) => chocolate ? "Your order will be in the porch fridge." : "Your order will be on the porch table.";

/**
 * Thanksgiving 2026, a one-off. Orders placed after the usual Tuesday cutoff
 * and before Saturday at 9 p.m. pick up Monday or Tuesday (morning or night)
 * instead of Friday or Saturday. She is out of town the weekend after, so that
 * Friday is skipped and later orders roll to December 4. The second pickup day
 * is still "the day after the first", so Monday and Tuesday ride the same rails
 * as Friday and Saturday; only the words change. Every date is Arizona time.
 */
export const THANKSGIVING = {
  first: "2026-11-23",
  second: "2026-11-24",
  opensAt: Date.parse("2026-11-18T04:00:00Z"), // Tue Nov 17, 9 p.m.
  closesAt: Date.parse("2026-11-22T04:00:00Z"), // Sat Nov 21, 9 p.m.
  showUntil: Date.parse("2026-11-25T07:00:00Z"), // end of Tue Nov 24
  skipped: ["2026-11-27"], // no pickups Fri Nov 27 or Sat Nov 28
} as const;
export const thanksgivingNoticeShowing = (now = Date.now()) => now < THANKSGIVING.showUntil;
export const thanksgivingOrdersOpen = (now = Date.now()) => now >= THANKSGIVING.opensAt && now < THANKSGIVING.closesAt;
/** Today's date in Arizona, "2026-11-17". */
export function todayAZ(now = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
}
/**
 * The days a ready-now extras order can be picked up: today, if today comes
 * before that weekend's Friday, then the Friday and Saturday themselves.
 */
export function extrasPickupDays(weekend: string, now = Date.now()): string[] {
  const today = todayAZ(now), saturday = saturdayDate(weekend);
  return [...(today < weekend ? [today] : []), weekend, saturday].filter(d => d >= today);
}
/** Where the Thanksgiving week stands: still taking its orders, closed and baking, or over. */
export function thanksgivingPhase(now = Date.now()): "ordering" | "closed" | "over" {
  return now < THANKSGIVING.closesAt ? "ordering" : now < THANKSGIVING.showUntil ? "closed" : "over";
}
/** Monday's bake, offered alongside the usual days while it is still open and is not already the next bake. */
export const thanksgivingExtraBake = (now = Date.now()) => now < THANKSGIVING.closesAt && pickupDate(now) !== THANKSGIVING.first ? THANKSGIVING.first : undefined;
export const isThanksgivingPickup =(date: string) => date === THANKSGIVING.first || date === THANKSGIVING.second;
/** "Monday", "Friday": the weekday of a pickup date. */
export const weekdayOf = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long" }).format(new Date(`${date}T12:00:00Z`)) : date;
/** How a half-day reads: "Morning", "Afternoon, from noon", or "Night" for the Thanksgiving pickups. */
export function periodLabel(date: string, period: string | undefined): string {
  if (period !== "afternoon") return "Morning";
  return isThanksgivingPickup(date) ? "Night" : "Afternoon, from noon";
}
export function pickupDate(now = Date.now()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(now));
  const part = (type: string) => Number(parts.find(p => p.type === type)?.value);
  const date = new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
  const day = date.getUTCDay();
  let days = (5 - day + 7) % 7;
  if ((day === 2 && part("hour") >= 21) || (day >= 3 && day <= 5)) days += 7;
  if (thanksgivingOrdersOpen(now)) return THANKSGIVING.first;
  date.setUTCDate(date.getUTCDate() + days);
  while ((THANKSGIVING.skipped as readonly string[]).includes(date.toISOString().slice(0, 10))) date.setUTCDate(date.getUTCDate() + 7);
  const result = date.toISOString().slice(0, 10);
  return result < FIRST_PICKUP_DATE ? FIRST_PICKUP_DATE : result;
}
export function saturdayDate(friday: string): string {
  const d = new Date(`${friday}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10);
}
export function pickupDateLabel(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" }).format(new Date(`${date}T12:00:00Z`));
}
/** "Friday, October 23, and Saturday, October 24" — always the pickup weekend now open for orders. */
export function nextPickups(now = Date.now()): string {
  const friday = pickupDate(now);
  return `${pickupDateLabel(friday)}, and ${pickupDateLabel(saturdayDate(friday))}`;
}
/** Short form for tight spots: "October 23 and 24" (handles month changes). */
export function nextPickupsShort(now = Date.now()): string {
  const friday = pickupDate(now), saturday = saturdayDate(friday);
  const month = (d: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long" }).format(new Date(`${d}T12:00:00Z`));
  const day = (d: string) => Number(d.slice(8));
  return month(friday) === month(saturday) ? `${month(friday)} ${day(friday)} and ${day(saturday)}` : `${month(friday)} ${day(friday)} and ${month(saturday)} ${day(saturday)}`;
}
