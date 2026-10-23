import type { Order, OrderItem } from "@/lib/orders";
import { omissionLabel, sizeLabel } from "@/lib/products";

export const itemOz = (item: OrderItem) => (item.sizeOz ?? (item.format === "sampler" ? 3 : 16)) * item.qty;
export const pounds = (oz: number) => (oz / 16).toLocaleString("en-US", { maximumFractionDigits: 3 });
export const itemDescription = (item: OrderItem) => `${item.name} · ${sizeLabel(item.sizeOz ?? (item.format === "sampler" ? 3 : 16))}${item.omissions?.length ? ` · ${item.omissions.map(o => omissionLabel[o]).join(", ")}` : ""}`;
export const bakeFor = (order: Order) => {
  if (order.bakeId) return order.bakeId;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(order.runDate)) return order.runDate;
  const date = new Date(`${order.runDate}T12:00:00Z`);
  if (date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};
export const pickupWaiting = (order: Order) => order.items.some(i => !i.gift) && !(order.pickupDone ?? order.delivered);
export const giftsWaiting = (order: Order) => order.items.filter(i => i.gift && !(order.giftsDone?.[i.gift.id] ?? order.delivered)).reduce((n, i) => n + i.qty, 0);
export function arizonaWindow(now = Date.now()) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(now));
  const part = (name: string) => date.find(p => p.type === name)!.value;
  const end = Date.parse(`${part("year")}-${part("month")}-${part("day")}T00:00:00-07:00`) + 86_400_000;
  return { start: (end - 7 * 86_400_000) / 1000, previous: (end - 14 * 86_400_000) / 1000, end: end / 1000, now: now / 1000 };
}
export function dashboardSummary(orders: Order[], now = Date.now()) {
  const window = arizonaWindow(now);
  const current = orders.filter(o => o.createdAt >= window.start && o.createdAt <= window.now);
  const previous = orders.filter(o => o.createdAt >= window.previous && o.createdAt < window.start);
  return { count: current.length, cents: current.reduce((n, o) => n + o.amountCents, 0), previousCount: previous.length, previousCents: previous.reduce((n, o) => n + o.amountCents, 0), pickups: orders.filter(pickupWaiting).length, gifts: orders.reduce((n, o) => n + giftsWaiting(o), 0) };
}
export function filterOrders(orders: Order[], { status = "outstanding", q = "", bake = "", page = 1 }: { status?: string; q?: string; bake?: string; page?: number }) {
  const query = q.trim().toLowerCase();
  const filtered = orders.filter(o => (status === "all" || (status === "completed" ? o.delivered : !o.delivered)) && (!bake || bakeFor(o) === bake) && (!query || [o.name, o.email, o.phone, o.id, ...o.items.map(i => `${i.name} ${i.gift?.recipientName ?? ""}`)].join(" ").toLowerCase().includes(query)));
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const current = Math.min(pages, Math.max(1, Math.floor(page) || 1));
  return { orders: filtered.slice((current - 1) * 25, current * 25), total: filtered.length, pages, page: current };
}
