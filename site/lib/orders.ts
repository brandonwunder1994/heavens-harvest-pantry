import type { Omission, SizeOz } from "@/lib/products";
import type { CartLine } from "@/lib/cart";
export type OrderItem = { priceCents?: number; qty: number; name: string; format: "jar" | "bag" | "sampler"; slug?:string; sizeOz?:SizeOz; omissions?:Omission[]; gift?:CartLine["gift"]; ingredients?:string; allergens?:string; requiresCooling?:boolean };

export type Order = {
  bakeId?:string;
  pickupPeriod?:string;
  requiresCooling?:boolean;
  pickupDone?:boolean;
  giftsDone?:Record<string,boolean>;
  storedId?:string;
  emailStatus?:string;
  emailError?:string;
  /** Lower-cased, so a customer's own orders can be found. */
  email: string;
  id: string;
  createdAt: number;
  amountCents: number;
  name: string;
  phone: string;
  method: "delivery" | "dropoff";
  area: string;
  runDate: string;
  address: string;
  note: string;
  ownerNote?: string;
  ownerLog?: string[];
  prayer: string;
  jarsReturned: number;
  blessingBags: number;
  points: number;
  items: OrderItem[];
  delivered: boolean;
  paymentIntentId: string | null;
};

/** The shape we need out of a Stripe session, kept narrow so this file can be
 *  read and tested without pulling the Stripe types in. */
export type SessionLike = {
  id: string;
  created: number;
  customer_details?: { email?: string | null } | null;
  amount_total: number | null;
  payment_status?: string;
  payment_intent?: string | { id: string } | null;
  metadata?: Record<string, string> | null;
};

/** "2x Maple Pecan (bag); 1x Dark Chocolate Sea Salt (jar)" */
export function parseItems(raw: string): OrderItem[] {
  if (!raw) return [];
  return raw
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = /^(\d+)x\s+(.*)\s+\((jar|bag|sampler)\)$/i.exec(part);
      if (!match) return null;
      return {
        qty: Number(match[1]),
        name: match[2].trim(),
        format: match[3].toLowerCase() as OrderItem["format"],
      };
    })
    .filter((item): item is OrderItem => item !== null);
}

export function toOrder(session: SessionLike): Order {
  const meta = session.metadata ?? {};
  const pi = session.payment_intent;
  return {
    id: session.id,
    createdAt: session.created,
    email: (session.customer_details?.email ?? "").toLowerCase(),
    amountCents: session.amount_total ?? 0,
    name: meta.customer_name ?? "",
    phone: meta.phone ?? "",
    method: meta.method === "dropoff" ? "dropoff" : "delivery",
    area: meta.run_area ?? "",
    runDate: meta.run_date ?? "",
    address: meta.address ?? "",
    note: meta.porch_note ?? "",
    prayer: meta.prayer_request ?? "",
    jarsReturned: Number(meta.jars_returned ?? 0) || 0,
    blessingBags: Number(meta.blessing_bags ?? 0) || 0,
    points: Number(meta.points_earned ?? 0) || 0,
    items: parseItems(meta.items ?? ""),
    delivered: meta.delivered === "yes",
    paymentIntentId: typeof pi === "string" ? pi : (pi?.id ?? null),
  };
}

export const jarsIn = (order: Order): number =>
  order.items.filter((i) => i.format === "jar").reduce((n, i) => n + i.qty, 0);

export const unitsIn = (order: Order): number => order.items.reduce((n, i) => n + i.qty, 0);

export type Summary = {
  todayCents: number;
  todayCount: number;
  weekCents: number;
  previousWeekCents: number;
  jarsOut: number;
  jarsDueBack: number;
  repeatRate: number;
  blessingBagsWaiting: number;
};

const DAY = 86_400;

export function summarise(orders: Order[], now: number, runDate: string): Summary {
  const startOfToday = startOfDay(now);
  const today = orders.filter((o) => o.createdAt >= startOfToday);
  const week = orders.filter((o) => o.createdAt >= now - 7 * DAY);
  const previousWeek = orders.filter(
    (o) => o.createdAt >= now - 14 * DAY && o.createdAt < now - 7 * DAY,
  );

  const jarsSold = orders.reduce((n, o) => n + jarsIn(o), 0);
  const jarsBack = orders.reduce((n, o) => n + o.jarsReturned, 0);

  const byPhone = new Map<string, number>();
  for (const o of orders) {
    if (!o.phone) continue;
    byPhone.set(o.phone, (byPhone.get(o.phone) ?? 0) + 1);
  }
  const customers = byPhone.size;
  const repeats = [...byPhone.values()].filter((n) => n > 1).length;

  return {
    todayCents: today.reduce((n, o) => n + o.amountCents, 0),
    todayCount: today.length,
    weekCents: week.reduce((n, o) => n + o.amountCents, 0),
    previousWeekCents: previousWeek.reduce((n, o) => n + o.amountCents, 0),
    jarsOut: Math.max(0, jarsSold - jarsBack),
    jarsDueBack: orders
      .filter((o) => o.runDate === runDate && !o.delivered)
      .reduce((n, o) => n + o.jarsReturned, 0),
    repeatRate: customers === 0 ? 0 : Math.round((repeats / customers) * 100),
    blessingBagsWaiting: orders.filter((o) => !o.delivered).reduce((n, o) => n + o.blessingBags, 0),
  };
}

export type BakeRow = { name: string; jars: number; bags: number; total: number };

/** What to bake for a given run, biggest first. */
export function bakeList(orders: Order[], runDate: string): BakeRow[] {
  const rows = new Map<string, BakeRow>();

  for (const order of orders) {
    if (order.runDate !== runDate) continue;
    for (const item of order.items) {
      const row = rows.get(item.name) ?? { name: item.name, jars: 0, bags: 0, total: 0 };
      if (item.format === "jar") row.jars += item.qty;
      else row.bags += item.qty;
      row.total += item.qty;
      rows.set(item.name, row);
    }
  }

  return [...rows.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

/** Undelivered stops for a run, grouped so porches come before the drop-off. */
/**
 * Orders booked onto a run she no longer lists. Without this they vanish from
 * every screen she works from: never baked, never delivered, already paid for.
 */
export function orphanedOrders(orders: Order[], runDates: string[]): Order[] {
  const known = new Set(runDates);
  return orders
    .filter((order) => !order.delivered && !known.has(order.runDate))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function runSheet(orders: Order[], runDate: string): Order[] {
  return orders
    .filter((o) => o.runDate === runDate)
    .sort((a, b) => {
      if (a.delivered !== b.delivered) return a.delivered ? 1 : -1;
      if (a.method !== b.method) return a.method === "delivery" ? -1 : 1;
      return a.createdAt - b.createdAt;
    });
}

export function startOfDay(now: number): number {
  const d = new Date(now * 1000);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatCentsExact(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
