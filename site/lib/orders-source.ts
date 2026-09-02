import "server-only";
import { getStripe } from "@/lib/stripe";
import { toOrder, type Order } from "@/lib/orders";

export type OrdersResult =
  | { status: "ok"; orders: Order[] }
  | { status: "not_configured" }
  | { status: "error"; message: string };

/**
 * Stripe is the order book. Everything the owner's page shows is derived from
 * the sessions it has already stored, so there is no second database to keep
 * in step, and no copy of a customer's address anywhere else.
 */
export async function loadOrders(days = 60): Promise<OrdersResult> {
  const stripe = getStripe();
  if (!stripe) return { status: "not_configured" };

  const since = Math.floor(Date.now() / 1000) - days * 86_400;

  try {
    const orders: Order[] = [];
    for await (const session of stripe.checkout.sessions.list({
      created: { gte: since },
      limit: 100,
    })) {
      if (session.payment_status !== "paid") continue;
      orders.push(toOrder(session));
      if (orders.length >= 500) break;
    }
    orders.sort((a, b) => b.createdAt - a.createdAt);
    return { status: "ok", orders };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reach Stripe.";
    console.error("[orders] load failed:", message);
    return { status: "error", message };
  }
}

/**
 * One person's own orders, newest first.
 *
 * Stripe is already the order book, so this is the same read with a filter
 * rather than a second store to keep in step. An empty list is the honest
 * answer for somebody who has never ordered, and for a shop with no payment
 * account yet.
 */
export async function ordersFor(email: string, days = 730): Promise<Order[]> {
  const result = await loadOrders(days);
  if (result.status !== "ok") return [];
  const clean = email.trim().toLowerCase();
  return result.orders.filter((order) => order.email === clean);
}

/**
 * How many blessing bags neighbors have paid for this year. Returns null when
 * that cannot be answered — no payment account, or Stripe unreachable — so the
 * pages that show it can leave the line out rather than print a made-up number.
 */
export async function blessingBagsThisYear(): Promise<number | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const since = Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000);

  try {
    let total = 0;
    let seen = 0;
    for await (const session of stripe.checkout.sessions.list({
      created: { gte: since },
      limit: 100,
    })) {
      if (session.payment_status !== "paid") continue;
      total += Number(session.metadata?.blessing_bags ?? 0) || 0;
      if (++seen >= 1000) break;
    }
    return total;
  } catch (error) {
    console.error("[orders] could not count blessing bags:", error);
    return null;
  }
}

/** Writes the delivered flag back onto the payment, which is the one record
 *  that is always there and always ours to annotate. */
export async function markDelivered(orderId: string, delivered: boolean): Promise<boolean> {
  const stripe = getStripe();
  if (!stripe) return false;

  const session = await stripe.checkout.sessions.retrieve(orderId);
  const paymentIntent =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  const value = delivered ? "yes" : "no";
  if (paymentIntent) {
    await stripe.paymentIntents.update(paymentIntent, { metadata: { delivered: value } });
  }
  await stripe.checkout.sessions.update(orderId, { metadata: { delivered: value } });
  return true;
}
