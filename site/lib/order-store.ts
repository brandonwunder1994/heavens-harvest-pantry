import "server-only";
import { sql } from "@/lib/db";
import { CAPACITY_OZ, pickupDate } from "@/lib/fulfilment";
import { orderWeight, type Totals } from "@/lib/cart";
import type { OrderRequest } from "@/lib/order";
import { getStripe } from "@/lib/stripe";
import { confirmationCopy } from "@/lib/order-confirmation";
import { siteUrl } from "@/lib/site-url";
import { getShop } from "@/lib/settings";
import { sendMail } from "@/lib/mailer";
import type Stripe from "stripe";
import { guideSample } from "@/lib/handoff-sample";

export type OrderSnapshot = { order: OrderRequest; totals: Totals; sessionParams?: Stripe.Checkout.SessionCreateParams };
export type StoredOrder = { id: string; fingerprint: string; bake_id: string; ounces: number; status: "preparing"|"open"|"paid"|"released"; stripe_session: string|null; snapshot: OrderSnapshot; created_at: string; email: string; amount_cents: number|null; pickup_done: boolean; gifts_done: Record<string,boolean>; email_status: string; email_error: string; email_uncertain: boolean; email_first_attempt_at: string|null; email_payload: {text:string;html:string;from:string}|null };
export async function getStoredOrder(id: string): Promise<StoredOrder|null> {
  const rows = await sql()`select * from checkout_orders where id=${id}::uuid`; return rows[0] as StoredOrder ?? null;
}
export async function orderForSession(session: string): Promise<StoredOrder|null> {
  const rows = await sql()`select * from checkout_orders where stripe_session=${session}`; return rows[0] as StoredOrder ?? null;
}
export async function reserveOrder(id: string, fingerprint: string, snapshot: OrderSnapshot): Promise<StoredOrder|null> {
  const rows = await sql()`select * from reserve_bake_order(${id}::uuid,${fingerprint},${snapshot.order.details.bakeId}::date,${orderWeight(snapshot.order.lines)},${JSON.stringify(snapshot)}::jsonb)`;
  return rows[0] as StoredOrder ?? null;
}
export async function attachSession(id: string, session: string): Promise<void> {
  await sql()`update checkout_orders set stripe_session=${session},status=case when status='preparing' then 'open' else status end where id=${id}::uuid and (stripe_session is null or stripe_session=${session})`;
}
export async function capacity(bake = pickupDate()) {
  if(guideSample)return {bakeId:bake,paidOz:bake === "2026-10-09" ? 16 : 35,heldOz:8,remainingOz:bake === "2026-10-09" ? 744 : 725,capacityOz:768};
  const rows = await sql()`select b.reserved_oz,coalesce(sum(o.ounces) filter(where o.status='paid'),0)::int as paid_oz from bake_batches b left join checkout_orders o on o.bake_id=b.id where b.id=${bake}::date group by b.id`;
  const used = Number(rows[0]?.reserved_oz ?? 0), paid = Number(rows[0]?.paid_oz ?? 0);
  return { bakeId: bake, paidOz: paid, heldOz: used-paid, remainingOz: CAPACITY_OZ-used, capacityOz: CAPACITY_OZ };
}
export async function privatePickup(): Promise<{ address: string; contact: string }> {
  if(guideSample)return {address:"Private pickup address (sample)",contact:""};
  const rows = await sql()`select value from settings where key='privatePickup'`;
  const value = rows[0]?.value as {address?:unknown;contact?:unknown}|undefined;
  return { address: typeof value?.address === "string" ? value.address : "", contact: typeof value?.contact === "string" ? value.contact : "" };
}
export async function recordPaid(session: Stripe.Checkout.Session): Promise<StoredOrder|null> {
  if (session.payment_status !== "paid" || session.status !== "complete" || session.metadata?.practice === "true") return null;
  const id = session.metadata?.order_id;
  if (!id) return null; // Legacy orders remain readable in Stripe.
  const existing=await getStoredOrder(id);
  if(!existing||existing.status==='released'||(existing.stripe_session&&existing.stripe_session!==session.id)||session.currency!=='usd'||session.amount_subtotal!==existing.snapshot.totals.totalCents)throw new Error('Payment does not match the reserved order');
  await attachSession(id, session.id);
  const rows = await sql()`update checkout_orders set status='paid',email=${session.customer_details?.email ?? ""},amount_cents=${session.amount_total ?? 0} where id=${id}::uuid and status<>'released' returning *`;
  if (!rows[0]) throw new Error("Paid reservation missing; reconciliation required");
  return rows[0] as StoredOrder;
}
export async function releaseExpired(session: Stripe.Checkout.Session): Promise<void> {
  if (session.metadata?.practice === "true" || session.status !== "expired" || session.payment_status === "paid") return;
  if (session.metadata?.order_id) await sql()`select release_bake_order(${session.metadata.order_id}::uuid)`;
}
export async function listStoredOrders(): Promise<StoredOrder[]> {
  const orders: StoredOrder[] = [];
  // Stable database paging avoids silently hiding old outstanding orders.
  for (let offset = 0; ; offset += 500) {
    const rows = await sql()`select id, fingerprint, bake_id, ounces, status,
      stripe_session, snapshot, created_at, email, amount_cents, pickup_done,
      gifts_done, email_status, email_error, email_uncertain, email_first_attempt_at
      from checkout_orders where status='paid' order by created_at desc, id desc
      limit 500 offset ${offset}` as StoredOrder[];
    orders.push(...rows);
    if (rows.length < 500) return orders;
  }
}
export async function reconcileOpenOrders(): Promise<void> {
  const stripe = getStripe(); if (!stripe) return;
  const rows = await sql()`select * from checkout_orders where status in ('open','preparing') order by created_at limit 100` as StoredOrder[];
  for (const row of rows) {
    let session: Stripe.Checkout.Session;
    if(row.stripe_session) session=await stripe.checkout.sessions.retrieve(row.stripe_session);
    else {
      // An API timeout may occur after Stripe creates a session but before we
      // save its ID. Look it up before doing anything that could free its space.
      let found: Stripe.Checkout.Session|undefined;
      for await(const candidate of stripe.checkout.sessions.list({created:{gte:Math.floor(new Date(row.created_at).getTime()/1000)-120},limit:100})){
        if(candidate.metadata?.practice!=="true"&&candidate.metadata?.order_id===row.id){found=candidate;break;}
      }
      if(found)session=found;
      else if((row.snapshot.sessionParams?.expires_at??Infinity)<=Math.floor(Date.now()/1000)){
        // The saved request can no longer create a payable session, and Stripe
        // confirms there is no session for it. A release is now safe.
        await sql()`select release_bake_order(${row.id}::uuid)`;continue;
      }else continue; // Keep uncertain/in-flight creation reserved.
      await attachSession(row.id,session.id);
    }
    if (session.payment_status === "paid") { const paid = await recordPaid(session); if (paid) await emailOrder(paid.id); }
    else await releaseExpired(session);
  }
}
const OWNER_COPY_TO = "heavensharvestpantry@gmail.com";
export async function emailOrder(id: string): Promise<boolean> {
  // Resend remembers an idempotency key for 24 hours. An uncertain send older
  // than that needs provider review, rather than risking a second email.
  const blocked=await sql()`update checkout_orders set email_status='error',email_error='Email status is uncertain. Check the email provider before retrying.' where id=${id}::uuid and email_status<>'sent' and (email_uncertain or email_status='sending') and email_first_attempt_at<now()-interval '23 hours' returning id`;
  if(blocked.length)return false;
  const rows = await sql()`update checkout_orders set email_status='sending',email_claim_at=now(),email_first_attempt_at=coalesce(email_first_attempt_at,now()) where id=${id}::uuid and status='paid' and email<>'' and (email_status in ('pending','error') or (email_status='sending' and email_claim_at<now()-interval '5 minutes')) returning *`;
  if (!rows[0]) return true;
  const row = rows[0] as StoredOrder;
  try {
    if(!process.env.RESEND_API_KEY||!process.env.MAIL_FROM)throw new Error('Confirmation email is not configured.');
    const {totals}=row.snapshot;
    const personal=totals.lines.filter(p=>!p.line.gift);
    const pickup=personal.length ? await privatePickup() : null;
    if (pickup && !pickup.address) throw new Error("Pickup address has not been saved");
    const amount = row.amount_cents ?? totals.totalCents;
    const verse=row.email_payload?undefined:await getShop().then(s=>({text:s.verseOfTheWeek.text,reference:s.verseOfTheWeek.reference})).catch(()=>undefined);
    const copy = confirmationCopy(row.snapshot, pickup, amount, Math.max(0, amount-totals.totalCents), false, `${siteUrl()}/order/thank-you?session_id=${row.stripe_session}`, false, {origin:siteUrl()??undefined,verse});
    const payload=row.email_payload??{text:copy.text,html:copy.html,from:process.env.MAIL_FROM};
    if(!row.email_payload)await sql()`update checkout_orders set email_payload=${JSON.stringify(payload)}::jsonb where id=${id}::uuid`;
    const sent=await sendMail(row.email,copy.subject,payload.text,payload.html,`order-confirmation/${id}`,payload.from);
    if(!sent.ok&&(sent.reason==='network'||sent.uncertain))await sql()`update checkout_orders set email_uncertain=true where id=${id}::uuid`;
    if (!sent.ok) throw new Error(sent.reason);
    await sql()`update checkout_orders set email_status='sent',email_error='' where id=${id}::uuid`;
    // Her own copy, so she sees exactly what each customer was sent. A copy that fails never touches the order.
    await sendMail(OWNER_COPY_TO,`Receipt has gone out for ${row.snapshot.order.details.name}`,payload.text,payload.html,`order-confirmation-copy/${id}`,payload.from).catch(()=>undefined);
    return true;
  } catch(error) {
    const reason=error instanceof Error?error.message:"Email could not send";
    await sql()`update checkout_orders set email_status='error',email_error=${reason.slice(0,200)} where id=${id}::uuid`; return false;
  }
}
