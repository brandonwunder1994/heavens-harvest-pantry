import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { mockRun, sameOrigin, uuid } from "@/lib/mock-auth";
import { getMockStripe, mockPaymentsReady, mockTaxConfiguration } from "@/lib/mock-stripe";
import { isMockSession } from "@/lib/mock-policy";
import { validateOrder } from "@/lib/order";
import { checkoutSessionParams } from "@/lib/checkout-session";
import { readShop } from "@/lib/settings";
import { privatePickup } from "@/lib/order-store";
import { mockOrder, reserveMock, attachMock, reconcileMock, releaseMock } from "@/lib/mock-store";
import { siteUrl } from "@/lib/site-url";
import { mailReady } from "@/lib/mailer";
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({error:"invalid_origin"},403);
  const run=await mockRun(); if (!run) return reply({error:"owner_login_required"},401);
  let body:Record<string,unknown>;
  try { body=await request.json(); if (!body || Array.isArray(body) || typeof body!=="object") throw new Error(); } catch { return reply({error:"bad_request"},400); }
  if (!uuid(body.attemptId)) return reply({error:"invalid_attempt"},422);
  const id=body.attemptId;
  const {attemptId:ignored,...input}=body; void ignored;
  const fingerprint=createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const stripe=getMockStripe(),tax=mockTaxConfiguration(),origin=siteUrl();
  if (!stripe || !mockPaymentsReady() || !tax.ready || !origin) return reply({error:"mock_setup_pending",message:"Practice payment needs separate Stripe test keys, test tax rates and a test webhook. No real payment can be taken here."},503);
  if (!mailReady) return reply({error:"email_setup_pending",message:"The confirmation email connection still needs to be finished. Your practice basket is saved."},503);
  try {
    let row=await mockOrder(id);
    if (row && (row.run_id!==run || row.fingerprint!==fingerprint)) return reply({error:"attempt_conflict",message:"Your practice order changed. Try again."},409);
    if (row?.status==="paid") return reply({confirmationUrl:`/mockorder/order/thank-you?session_id=${row.stripe_session}`});
    if (row?.status==="released") return reply({error:"session_expired",message:"Your practice payment expired. Start payment again."},409);
    if (!row) {
      const {shop,live}=await readShop(); if (!live) return reply({error:"menu_unavailable",message:"The current menu could not load. Try again shortly."},503);
      const result=validateOrder(shop,body); if (!result.ok) return reply({error:"invalid",errors:result.errors},422);
      const {order,totals}=result;
      if (Number(body.expectedTotalCents)!==totals.totalCents) return reply({error:"price_changed",message:"Prices changed. Review your order before continuing."},409);
      if (totals.lines.some(p=>!p.line.gift) && !(await privatePickup()).address) return reply({error:"pickup_setup_pending",message:"Save your private pickup address in the owner settings first."},503);
      await reconcileMock(run);
      // Verify configured tax IDs actually belong to test mode before reserving.
      if (tax.rates) for (const rateId of [tax.rates.foodRateId,tax.rates.giftJarRateId]) {
        const rate=await stripe.taxRates.retrieve(rateId);
        if (rate.livemode || !rate.active || rate.inclusive) throw new Error("Invalid test tax rate");
      }
      const params=checkoutSessionParams(shop,order,totals,origin,undefined,tax.rates);
      params.return_url=`${origin}/mockorder/order/thank-you?session_id={CHECKOUT_SESSION_ID}`;
      params.metadata={...params.metadata,practice:"true",mock_run_id:run,order_id:id};
      params.branding_settings={...params.branding_settings,display_name:"MOCK — Heaven’s Harvest Pantry"};
      params.payment_intent_data={...params.payment_intent_data,metadata:params.metadata,description:"MOCK — practice order. No real fulfilment."};
      row=await reserveMock(id,run,fingerprint,{order,totals,sessionParams:params});
      if (!row) return reply({error:"bake_full",message:"Your practice bake is full. Reduce the quantity or use Start over for a fresh practice bake."},409);
    }
    const session=row.stripe_session?await stripe.checkout.sessions.retrieve(row.stripe_session):await stripe.checkout.sessions.create(row.snapshot.sessionParams!,{idempotencyKey:`mock-checkout/${id}`});
    if (!isMockSession(session) || session.metadata?.mock_run_id!==run) throw new Error("Non-practice session rejected");
    await attachMock(id,session.id);
    if (session.status==="expired") { await releaseMock(session); return reply({error:"session_expired",message:"Your practice payment expired. Start payment again."},409); }
    if (!session.client_secret) return reply({error:"payment_unavailable",message:"Your payment is processing. Retry this checkout shortly."},409);
    return reply({clientSecret:session.client_secret});
  } catch { return reply({error:"checkout_unavailable",message:"Practice payment could not load. Retry this same checkout; your basket is saved."},503); }
}
