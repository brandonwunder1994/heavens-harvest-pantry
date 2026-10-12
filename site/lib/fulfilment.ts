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
export const ADDRESS_NOTE = "Please keep our home address private. It’s just for your pickup.";
export const storageMessage = (chocolate: boolean) => chocolate ? "Your order will be in the porch fridge." : "Your order will be on the porch table.";
export function pickupDate(now = Date.now()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(now));
  const part = (type: string) => Number(parts.find(p => p.type === type)?.value);
  const date = new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
  const day = date.getUTCDay();
  let days = (5 - day + 7) % 7;
  if ((day === 2 && part("hour") >= 21) || (day >= 3 && day <= 5)) days += 7;
  date.setUTCDate(date.getUTCDate() + days);
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
