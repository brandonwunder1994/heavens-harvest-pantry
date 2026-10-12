import type { Order } from "@/lib/orders";
import type { StoredOrder } from "@/lib/order-store";
import { ingredientsWithout } from "@/lib/products";

/** Payment sessions and purchased snapshots describe the same sale. */
export function mergePurchasedOrders(payments: Order[], stored: StoredOrder[]): Order[] {
  const bySession = new Map(payments.map(order => [order.id, order]));
  for (const row of stored) {
    const id = row.stripe_session ?? row.id;
    const existing = bySession.get(id);
    const { order, totals } = row.snapshot;
    const items = totals.lines.map(p => ({ qty: p.line.qty, name: p.flavor.name, format: p.line.format, slug: p.line.slug, sizeOz: p.line.sizeOz ?? (p.line.format === "sampler" ? 3 as const : 16 as const), omissions: p.line.omissions, gift: p.line.gift, ingredients: ingredientsWithout(p.flavor.ingredients, p.line.omissions), allergens: p.flavor.allergens, requiresCooling: p.flavor.requiresCooling }));
    const complete = (!items.some(i => !i.gift) || row.pickup_done) && items.filter(i => i.gift).every(i => row.gifts_done[i.gift!.id]);
    bySession.set(id, { id, createdAt: Math.floor(new Date(row.created_at).getTime() / 1000), email: row.email, amountCents: row.amount_cents ?? existing?.amountCents ?? totals.totalCents, name: order.details.name, phone: order.details.phone, method: "dropoff", area: "Porch pickup", runDate: order.details.runDate, address: "", note: order.details.note, prayer: order.details.prayer, jarsReturned: 0, blessingBags: items.filter(i => i.gift).reduce((n, i) => n + i.qty, 0), points: 0, items, delivered: complete, paymentIntentId: existing?.paymentIntentId ?? null, bakeId: order.details.bakeId, pickupPeriod: order.details.pickupPeriod, requiresCooling: order.details.requiresCooling, pickupDone: row.pickup_done, giftsDone: row.gifts_done, storedId: row.id, emailStatus: row.email_status, emailError: row.email_error });
  }
  return [...bySession.values()].sort((a, b) => b.createdAt - a.createdAt);
}
