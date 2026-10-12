// Reasons to come back.
//
// The four ideas in phase two — welcome back, the jar shelf, the verse wall and
// the Sunday note — all read from the same two things: somebody's past orders
// and their points. This file turns those into the handful of facts each piece
// needs, and nothing here touches a database, a network or a framework.
//
// Everything is written to be honest when there is nothing to say. A shelf with
// no jars on it, a wall with no cards, a greeting for somebody ordering for the
// first time: each of those is a real state, not an error, and each one says
// something true rather than showing an empty box.

export type OrderItem = { qty: number; name: string; format: "jar" | "bag" | "sampler" };

/** The part of the shop's own Order type that any of this needs. */
export type PastOrder = {
  id: string;
  /** Seconds, the way Stripe records it. */
  createdAt: number;
  method: "delivery" | "dropoff";
  area: string;
  runDate: string;
  jarsReturned: number;
  items: OrderItem[];
};

const DAY = 86_400;

/** Newest first, which is how every one of these reads. */
export function newestFirst(orders: PastOrder[]): PastOrder[] {
  return [...orders].sort((a, b) => b.createdAt - a.createdAt);
}

/** A basket compared by what is in it, not the order it was added in. */
export function basketKey(items: OrderItem[]): string {
  return items
    .map((i) => `${i.qty}x${i.name.trim().toLowerCase()}:${i.format}`)
    .sort()
    .join("|");
}

export type Usual = {
  items: OrderItem[];
  method: "delivery" | "dropoff";
  area: string;
  /** How many times they have ordered exactly this. */
  times: number;
  /** When they last did. Seconds. */
  lastAt: number;
};

/**
 * Their usual: the basket they have ordered most often. Ties go to whichever
 * they bought most recently, so a habit that is changing is followed rather
 * than argued with.
 *
 * Null when they have never ordered — there is no usual to offer, and guessing
 * one would be worse than saying nothing.
 */
export function theUsual(orders: PastOrder[]): Usual | null {
  const withItems = orders.filter((o) => o.items.length > 0);
  if (withItems.length === 0) return null;

  const groups = new Map<string, PastOrder[]>();
  for (const order of withItems) {
    const key = basketKey(order.items);
    const group = groups.get(key);
    if (group) group.push(order);
    else groups.set(key, [order]);
  }

  let best: PastOrder[] | null = null;
  for (const group of groups.values()) {
    if (!best) {
      best = group;
      continue;
    }
    const lastOf = (g: PastOrder[]) => Math.max(...g.map((o) => o.createdAt));
    if (group.length > best.length || (group.length === best.length && lastOf(group) > lastOf(best))) {
      best = group;
    }
  }
  if (!best) return null;

  const latest = newestFirst(best)[0];
  return {
    items: latest.items,
    method: latest.method,
    area: latest.area,
    times: best.length,
    lastAt: latest.createdAt,
  };
}

/** "Two bags of Honey Almond Crunch and a jar of Maple Pecan" */
export function describeBasket(items: OrderItem[]): string {
  const words = ["", "a", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const say = (n: number) => (n < words.length ? words[n] : String(n));

  const parts = items.map((i) => {
    const unit = i.format === "jar" ? "jar" : "bag";
    const plural = i.qty === 1 ? unit : `${unit}s`;
    return `${say(i.qty)} ${plural} of ${i.name}`;
  });

  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

// ---------------------------------------------------------------- the shelf

export type ShelfJar = { at: number; nth: number };

/** Every jar that has come back, oldest first, numbered as it was returned. */
export function shelf(orders: PastOrder[]): ShelfJar[] {
  const jars: ShelfJar[] = [];
  const oldestFirst = [...orders].sort((a, b) => a.createdAt - b.createdAt);
  for (const order of oldestFirst) {
    for (let i = 0; i < Math.max(0, order.jarsReturned); i++) {
      jars.push({ at: order.createdAt, nth: jars.length + 1 });
    }
  }
  return jars;
}

export const jarsKept = (orders: PastOrder[]): number =>
  orders.reduce((n, o) => n + Math.max(0, o.jarsReturned), 0);

/**
 * What the shelf says underneath itself.
 *
 * Not "you have saved the planet" — a real number, and the one thing that
 * number actually means.
 */
export function shelfLine(count: number): string {
  if (count === 0) return "Bring a jar back and the first one lands here.";
  if (count === 1) return "One jar kept out of the landfill, and two dollars off.";
  return `${count} jars kept out of the landfill, and $${count * 2} off along the way.`;
}

// ----------------------------------------------------------- the verse wall

export type WallCard<V> = { verse: V; on: Date; orderId: string };

/**
 * The verse that came in each of their boxes, newest first.
 *
 * `verseFor` is the shop's own weekly rotation, passed in rather than copied,
 * so the wall and the site can never disagree about which verse a week had.
 * Two orders in one week share a card, because they shared a card.
 */
export function verseWall<V>(orders: PastOrder[], verseFor: (on: Date) => V): WallCard<V>[] {
  const seen = new Set<string>();
  const cards: WallCard<V>[] = [];

  for (const order of newestFirst(orders)) {
    const on = new Date(order.createdAt * 1000);
    const week = mondayKey(on);
    if (seen.has(week)) continue;
    seen.add(week);
    cards.push({ verse: verseFor(on), on, orderId: order.id });
  }
  return cards;
}

function mondayKey(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
}

// ------------------------------------------------------------- welcome back

export type Welcome = {
  /** "Welcome back, Sarah." or "Welcome back." when we were never told a name. */
  greeting: string;
  /** Null for a first-time visitor: there is nothing to offer again. */
  usual: Usual | null;
  /** Days since they last ordered, or null if they never have. */
  sinceDays: number | null;
};

export function welcome(name: string, orders: PastOrder[], now: Date = new Date()): Welcome {
  const first = name.trim().split(/\s+/)[0] ?? "";
  const usual = theUsual(orders);
  const last = orders.length ? Math.max(...orders.map((o) => o.createdAt)) : null;

  return {
    greeting: first ? `Welcome back, ${first}.` : "Welcome back.",
    usual,
    sinceDays: last === null ? null : Math.max(0, Math.floor(now.getTime() / 1000 / DAY - last / DAY)),
  };
}

/** How long it has been, said the way a person would say it. */
export function howLong(days: number | null): string {
  if (days === null) return "";
  if (days === 0) return "earlier today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  const months = Math.round(days / 30);
  return months < 24 ? `${months} months ago` : `over ${Math.floor(months / 12)} years ago`;
}
