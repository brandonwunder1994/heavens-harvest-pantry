import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import Stripe from "stripe";
import { getStripe, paymentsConfigured } from "@/lib/stripe";
import { validateOrder } from "@/lib/order";
import { checkoutSessionParams } from "@/lib/checkout-session";
import { checkoutTaxConfiguration } from "@/lib/checkout-tax";
import { readShop } from "@/lib/settings";
import { siteUrl } from "@/lib/site-url";
import { ordersArePaused, ORDERS_PAUSED_MESSAGE } from "@/lib/fulfilment";
import { getStoredOrder, reserveOrder, attachSession, privatePickup, reconcileOpenOrders, releaseExpired } from "@/lib/order-store";
import { sql } from "@/lib/db";

const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(request: Request) {
  try { if(new URL(request.headers.get("referer") || request.url).pathname.startsWith("/mock")) return reply({error:"practice_route_required"},400); } catch { return reply({error:"bad_request"},400); }
  if(ordersArePaused()) return reply({error:"orders_paused",message:ORDERS_PAUSED_MESSAGE},503);
  let body: Record<string,unknown>;
  try { const raw=await request.json(); if(!raw || typeof raw!=="object" || Array.isArray(raw)) return reply({error:"bad_request"},400); body=raw; } catch { return reply({error:"bad_request"},400); }
  const attemptId=typeof body.attemptId==="string"?body.attemptId:"";
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId)) return reply({error:"invalid_attempt",message:"Refresh checkout and try again."},422);
  const {attemptId: ignored,...input}=body; void ignored;
  const fingerprint=createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const stripe=getStripe();
  if(!stripe || !paymentsConfigured()) return reply({error:"payments_not_configured",message:"Card payments are not connected yet. Please try again soon."},503);
  const tax=checkoutTaxConfiguration(process.env);
  if(!tax.ready) return reply({error:"tax_setup_pending",message:"Online payment is being finished. Please check back shortly."},503);
  const origin=siteUrl(); if(!origin) return reply({error:"site_url_missing"},503);
  try {
    let stored=await getStoredOrder(attemptId);
    if(stored && stored.fingerprint!==fingerprint) return reply({error:"attempt_conflict",message:"Your order changed. Review it and start payment again."},409);
    if(stored?.status==="paid") return reply({confirmationUrl:`/order/thank-you?session_id=${stored.stripe_session}`});
    if(stored?.status==="released") return reply({error:"session_expired",message:"Your payment session expired. Start payment again."},409);
    if(!stored) {
      const ready=await sql()`select value from settings where key='bakeCapacityReady'`;
      if(ready[0]?.value!==true)return reply({error:"capacity_setup_pending",message:"We are checking the bake list. Please try again shortly."},503);
      const {shop,live}=await readShop();
      if(!live) return reply({error:"menu_unavailable",message:"The current menu could not load. Please try again shortly."},503);
      const result=validateOrder(shop,body);
      if(!result.ok) return reply({error:"invalid",errors:result.errors},422);
      const {order,totals}=result;
      if(Number(body.expectedTotalCents)!==totals.totalCents) return reply({error:"price_changed",totalCents:totals.totalCents,message:"Prices changed while you were shopping. Review the new total before continuing."},409);
      if(totals.lines.some(p=>!p.line.gift) && !(await privatePickup()).address) return reply({error:"pickup_setup_pending",message:"Pickup details are being finished. Please check back shortly."},503);
      await reconcileOpenOrders();
      const params=checkoutSessionParams(shop,order,totals,origin,undefined,tax.rates);
      params.metadata={...params.metadata,order_id:attemptId};
      if(params.payment_intent_data) params.payment_intent_data.metadata={...params.metadata};
      stored=await reserveOrder(attemptId,fingerprint,{order,totals,sessionParams:params});
      if(!stored) return reply({error:"bake_full",message:"This bake does not have enough space for your order. Your basket is saved; reduce the quantity or check back for the next bake."},409);
    }
    const session=stored.stripe_session ? await stripe.checkout.sessions.retrieve(stored.stripe_session) : await stripe.checkout.sessions.create(stored.snapshot.sessionParams!,{idempotencyKey:`checkout/${attemptId}`});
    await attachSession(attemptId,session.id);
    if(session.status==="expired") {await releaseExpired(session);return reply({error:"session_expired",message:"Your payment session expired. Start payment again."},409);}
    if(!session.client_secret) return reply({error:"payment_unavailable",message:"Payment could not load. Please try again."},502);
    return reply({clientSecret:session.client_secret});
  } catch(error) {
    console.error("[checkout] payment or reservation failed",{type:error instanceof Stripe.errors.StripeError?error.type:"database_or_configuration"});
    return reply({error:"checkout_unavailable",message:"We could not verify payment space just now. Please retry this same checkout. Your basket is saved."},503);
  }
}
