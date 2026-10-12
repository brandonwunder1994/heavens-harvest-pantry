import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { databaseReady } from "@/lib/db";
import { award, findOrCreateCustomer } from "@/lib/rewards-source";
import { getShop } from "@/lib/settings";
import type Stripe from "stripe";
import { REWARDS_ENABLED } from "@/lib/features";
import { recordPaid, emailOrder, releaseExpired } from "@/lib/order-store";

/**
 * Stripe tells us here, server to server, that money actually moved. Stripe
 * itself is the order book; the only thing written down on our side is the
 * customer's rewards points, keyed on the email Stripe collected.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !secret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "bad signature";
    console.error("[webhook] rejected:", message);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.livemode !== !(process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_") || (event.data.object as {metadata?:Record<string,string>}).metadata?.practice === "true") {
    return NextResponse.json({error:"wrong_payment_mode"},{status:400});
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    const meta = session.metadata ?? {};

    let recorded = true;
    try {
      const stored = await recordPaid(session);
      if (stored) await emailOrder(stored.id);
      if (REWARDS_ENABLED) recorded = await awardPoints(session, meta);
    } catch { recorded = false; }
    if (!recorded) {
      // Telling Stripe this failed makes it try again, and the unique index on
      // the session id means a repeat cannot pay anyone twice. Swallowing it
      // would lose the customer's points silently and for good.
      return NextResponse.json({ error: "not_recorded" }, { status: 500 });
    }

    if (session.payment_status !== "paid") return NextResponse.json({ received: true });
    // Deliberately no name and no address: these lines are kept by the host for
    // weeks, and the order itself already lives in Stripe.
    console.log(
      "[webhook] paid order",
      JSON.stringify({
        id: session.id,
        amount: session.amount_total,
        jars: meta.jars_returned,
        blessing: meta.blessing_bags,
        points: meta.points_earned,
      }),
    );
  }

  if (event.type === "checkout.session.expired") {
    try { await releaseExpired(event.data.object); }
    catch { return NextResponse.json({ error: "release_failed" }, { status: 500 }); }
  }

  return NextResponse.json({ received: true });
}

/**
 * Points are written against the email Stripe collected, and the Stripe session
 * id is the receipt: Stripe retries webhooks, and the same order must never pay
 * out twice. A failure here is logged, never returned, because telling Stripe
 * the webhook failed would make it retry an order that was already recorded.
 */
async function awardPoints(
  session: Stripe.Checkout.Session,
  meta: Record<string, string>,
): Promise<boolean> {
  if (!databaseReady) return true;

  // `completed` is not the same as `paid`. Turn on a slower payment method in
  // Stripe and this fires before the money has moved, including for payments
  // that go on to fail.
  if (session.payment_status !== "paid") return true;

  const email = session.customer_details?.email;
  const earned = Number(meta.points_earned);
  if (!email || !Number.isFinite(earned) || earned <= 0) return true;

  try {
    const shop = await getShop();
    const customerId = await findOrCreateCustomer(email, meta.customer_name, meta.phone);
    await award(customerId, earned, "Order", session.id);

    // The welcome bonus lands once, on the first order, and the session id keeps
    // it that way even if this runs again.
    if (shop.rewards.welcomeBonus > 0) {
      await award(customerId, shop.rewards.welcomeBonus, "Welcome bonus", `welcome:${customerId}`);
    }
    return true;
  } catch (error) {
    console.error("[webhook] could not record points", error);
    return false;
  }
}
