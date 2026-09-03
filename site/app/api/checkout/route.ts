import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { orderMetadata, validateOrder } from "@/lib/order";
import { business } from "@/lib/content";
import { getShop } from "@/lib/settings";
import { siteUrl } from "@/lib/site-url";
import type Stripe from "stripe";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Prices are recomputed here from the flavor list. Nothing the browser sends
  // about money is trusted. This runs before the payment check so that a
  // missing address is reported as a missing address, whatever Stripe's state.
  const shop = await getShop();
  const result = validateOrder(shop, body);
  if (!result.ok) {
    return NextResponse.json({ error: "invalid", errors: result.errors }, { status: 422 });
  }

  // The browser tells us what it showed the customer. If her prices moved while
  // they were shopping, we say so and let them look again rather than charging
  // a different number from the one on the button they pressed.
  const expected = Number((body as { expectedTotalCents?: unknown })?.expectedTotalCents);
  if (Number.isFinite(expected) && expected !== result.totals.totalCents) {
    return NextResponse.json(
      {
        error: "price_changed",
        totalCents: result.totals.totalCents,
        message: "Her prices changed while you were shopping. Have a look at the new total.",
      },
      { status: 409 },
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "payments_not_configured", message: "Card payments are not connected yet." },
      { status: 503 },
    );
  }

  const { order, totals } = result;
  const run = shop.delivery.runs[order.details.runIndex];

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = totals.lines.map((p) => ({
    quantity: p.line.qty,
    price_data: {
      currency: "usd",
      unit_amount: p.unitCents,
      product_data: {
        name: `${p.flavor.name}${p.line.name ? ` for ${p.line.name}` : ""} · ${
          p.line.format === "jar" ? "mason jar" : "bag"
        }`,
        description: p.flavor.blurb,
      },
    },
  }));

  if (order.blessingBags > 0) {
    lineItems.push({
      quantity: order.blessingBags,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(shop.blessingBag.price * 100),
        product_data: {
          name: "Blessing bag for a neighbor",
          description: "A bag of granola delivered to someone who could use one.",
        },
      },
    });
  }

  // Where Stripe sends the customer back to. Taken from our own configuration,
  // never from the request, so nobody can hand Stripe a return address of theirs.
  const origin = siteUrl();
  if (!origin) {
    console.error("[checkout] NEXT_PUBLIC_SITE_URL is not set");
    return NextResponse.json(
      { error: "site_url_missing", message: "Checkout is not finished being set up." },
      { status: 503 },
    );
  }

  try {
    // A jar return is a discount, not a negative line, so it shows on the
    // receipt as its own line the way it does on our own summary.
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (totals.jarCreditAppliedCents > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: totals.jarCreditAppliedCents,
        currency: "usd",
        duration: "once",
        name: `${order.jarsReturned} jar${order.jarsReturned === 1 ? "" : "s"} returned`,
        max_redemptions: 1,
        redeem_by: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      });
      discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      discounts,
      submit_type: "pay",
      success_url: `${origin}/order/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?cancelled=1`,
      metadata: orderMetadata(shop, order, totals),
      payment_intent_data: {
        description: `${business.name} · ${run.area} ${run.nextDate}`,
        metadata: orderMetadata(shop, order, totals),
      },
      custom_text: {
        submit: {
          message:
            order.jarsReturned > 0
              ? `Leave your ${order.jarsReturned} jar${order.jarsReturned === 1 ? "" : "s"} out and she will pick them up.`
              : `Delivering ${run.area} on ${run.nextDate}.`,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "no_session_url" }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[checkout] stripe session failed:", message);
    return NextResponse.json({ error: "stripe_error", message }, { status: 502 });
  }
}
