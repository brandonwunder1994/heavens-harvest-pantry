// Runs only when explicitly requested in Vercel's protected build environment.
// Production credentials are never exported or printed.
import assert from "node:assert/strict";
import Stripe from "stripe";
import { neon } from "@neondatabase/serverless";

if (process.env.HHP_CHECKOUT_TAX_VERIFY === "1") {
  await import("./alias.mjs");
  await import("./verify-checkout-tax-display.mjs");
}

if (process.env.HHP_LAUNCH_CHECK !== "1") {
  console.log("Optional launch service check skipped.");
} else {
  assert.equal(process.env.VERCEL_ENV, "production");
  assert.equal(process.env.NEXT_PUBLIC_SITE_URL, "https://heavensharvestpantry.com");
  for (const name of ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET", "DATABASE_URL"]) assert.ok(process.env[name], `${name} is missing`);
  assert.ok(process.env.STRIPE_SECRET_KEY.startsWith("sk_live_"));
  assert.ok(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith("pk_live_"));
  assert.equal(process.env.CHECKOUT_TAX_APPROVED, "true");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 20000, maxNetworkRetries: 1 });
  const account = await stripe.accounts.retrieve();
  assert.equal(account.id, "acct_1UECha5dmwkQeT55");
  assert.equal(account.charges_enabled, true, "Stripe charges are disabled");
  if (process.env.CHECKOUT_TAX_MODE === "manual") {
    for (const name of ["STRIPE_FOOD_TAX_RATE_ID", "STRIPE_GIFT_JAR_TAX_RATE_ID"]) {
      const rate = await stripe.taxRates.retrieve(process.env[name]);
      assert.ok(rate.active && rate.livemode && !rate.inclusive, `${name} must be an active exclusive live rate`);
      console.log(`${name}: ${rate.percentage}% verified`);
    }
  } else assert.equal(process.env.CHECKOUT_TAX_MODE, "none");
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const endpoint = endpoints.data.find(e => e.status === "enabled" && e.url === "https://heavens-harvest-pantry.vercel.app/api/stripe/webhook");
  assert.ok(endpoint, "Existing production webhook is missing or disabled");
  const events = ["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.expired"];
  if (!endpoint.enabled_events.includes("*")) {
    assert.ok(events.slice(0, 2).every(event => endpoint.enabled_events.includes(event)), "Paid-order events are missing");
    if (!endpoint.enabled_events.includes(events[2])) {
      await stripe.webhookEndpoints.update(endpoint.id, { enabled_events: [...endpoint.enabled_events, events[2]] });
      console.log("Added session expiration to the existing webhook.");
    }
  }
  const sql = neon(process.env.DATABASE_URL);
  const ready = await sql`select value from settings where key='bakeCapacityReady'`;
  assert.equal(ready[0]?.value, true);
  const pickup = await sql`select length(trim(coalesce(value->>'address',''))) > 0 as present from settings where key='privatePickup'`;
  assert.equal(pickup[0]?.present, true);
  const label = await sql`select value->>'qrUrl' as url from settings where key='labelTemplates'`;
  if (label[0]?.url?.startsWith("https://heavens-harvest-pantry.vercel.app/")) {
    await sql`update settings set value=jsonb_set(value,'{qrUrl}',to_jsonb(replace(value->>'qrUrl','https://heavens-harvest-pantry.vercel.app','https://heavensharvestpantry.com'))),updated_at=now() where key='labelTemplates' and value->>'qrUrl' like 'https://heavens-harvest-pantry.vercel.app/%'`;
    console.log("Updated only the saved label QR origin; all label content preserved.");
  }
  for (const sessionId of [process.env.HHP_VERIFY_SESSION_ID, ...(process.env.HHP_VERIFY_EXTRA_SESSION_IDS ?? "").split(",")].filter(Boolean)) {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });
    assert.equal(session.metadata?.customer_name, "Launch Verification 2026-10-08");
    assert.equal(session.payment_status, "unpaid", "A paid session must never be expired");
    assert.ok(session.metadata?.order_id);
    assert.ok(session.return_url.startsWith("https://heavensharvestpantry.com/"));
    console.log(JSON.stringify({ subtotal: session.amount_subtotal, tax: session.total_details.amount_tax, total: session.amount_total, paid: false, customDomainReturn: true }));
    const expired = session.status === "open" ? await stripe.checkout.sessions.expire(session.id) : session;
    assert.equal(expired.status, "expired");
    await sql`select release_bake_order(${session.metadata.order_id}::uuid)`;
    const order = await sql`select status from checkout_orders where id=${session.metadata.order_id}::uuid`;
    assert.equal(order[0]?.status, "released");
    console.log("Unpaid launch verification session expired and its bake hold released. No payment or email was made.");
  }
  console.log(JSON.stringify({ account: "verified", chargesEnabled: true, payoutsEnabled: account.payouts_enabled, webhook: "verified", pickup: "configured", capacity: "ready", emailOptional: true }));
}
