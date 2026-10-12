import "server-only";
import type Stripe from "stripe";
import { sql } from "@/lib/db";
import { orderWeight } from "@/lib/cart";
import { CAPACITY_OZ, pickupDate } from "@/lib/fulfilment";
import { privatePickup, type StoredOrder, type OrderSnapshot } from "@/lib/order-store";
import { isMockSession } from "@/lib/mock-policy";
import { getMockStripe } from "@/lib/mock-stripe";
import { sendMail } from "@/lib/mailer";
import { confirmationCopy } from "@/lib/order-confirmation";
import { siteUrl } from "@/lib/site-url";
import { isSimulatedSnapshot } from "@/lib/mock-simulation";
import { expireSimulatedOrders } from "@/lib/mock-simulation-store";
export type MockOrder = StoredOrder & { run_id: string; tax_cents: number };
export async function mockOrder(id: string, run?: string): Promise<MockOrder | null> {
  const rows = run ? await sql()`select * from mock_checkout_orders where id=${id}::uuid and run_id=${run}::uuid` : await sql()`select * from mock_checkout_orders where id=${id}::uuid`;
  return rows[0] as MockOrder ?? null;
}
export async function reserveMock(id: string, run: string, fingerprint: string, snapshot: OrderSnapshot) {
  const rows = await sql()`select * from reserve_mock_order(${id}::uuid,${run}::uuid,${fingerprint},${snapshot.order.details.bakeId}::date,${orderWeight(snapshot.order.lines)},${JSON.stringify(snapshot)}::jsonb)`;
  return rows[0] as MockOrder ?? null;
}
export async function attachMock(id: string, session: string) {
  await sql()`update mock_checkout_orders set stripe_session=${session},status=case when status='preparing' then 'open' else status end where id=${id}::uuid and (stripe_session is null or stripe_session=${session})`;
}
export async function recordMock(session: Stripe.Checkout.Session) {
  if (!isMockSession(session) || session.payment_status !== "paid" || !session.metadata?.order_id) return null;
  const rows = await sql()`update mock_checkout_orders set status='paid',stripe_session=${session.id},email=${session.customer_details?.email ?? ""},amount_cents=${session.amount_total ?? 0},tax_cents=${session.total_details?.amount_tax ?? 0} where id=${session.metadata.order_id}::uuid and run_id=${session.metadata.mock_run_id}::uuid and status in ('preparing','open','paid') and (stripe_session is null or stripe_session=${session.id}) returning *`;
  if (!rows[0]) throw new Error("Practice reservation missing");
  return rows[0] as MockOrder;
}
export async function releaseMock(session: Stripe.Checkout.Session) {
  if (isMockSession(session) && session.status === "expired" && session.payment_status !== "paid" && session.metadata?.order_id) {
    const row = await mockOrder(session.metadata.order_id, session.metadata.mock_run_id);
    if (row && (!row.stripe_session || row.stripe_session === session.id)) await sql()`select release_mock_order(${row.id}::uuid)`;
  }
}
export async function mockCapacity(run: string, bake = pickupDate()) {
  const rows = await sql()`select reserved_oz from mock_bake_batches where run_id=${run}::uuid and id=${bake}::date`;
  return { bakeId: bake, remainingOz: CAPACITY_OZ - Number(rows[0]?.reserved_oz ?? 0), capacityOz: CAPACITY_OZ };
}
export async function listMockOrders() { return await sql()`select * from mock_checkout_orders where status='paid' order by created_at desc limit 500` as MockOrder[]; }
export async function emailMock(id: string) {
  const existing=await mockOrder(id);
  if(existing&&isSimulatedSnapshot(existing.snapshot))return true; // Preview only; never send a simulated receipt.
  const rows = await sql()`update mock_checkout_orders set email_status='sending',email_claim_at=now() where id=${id}::uuid and status='paid' and email<>'' and (email_status in ('pending','error') or (email_status='sending' and email_claim_at<now()-interval '5 minutes')) returning *`;
  if (!rows[0]) return true;
  const row = rows[0] as MockOrder;
  try {
    const pickup = row.snapshot.totals.lines.some(p => !p.line.gift) ? await privatePickup() : null;
    if (pickup && !pickup.address) throw new Error("Pickup address is not configured");
    const copy = confirmationCopy(row.snapshot, pickup, row.amount_cents ?? 0, row.tax_cents, true, `${siteUrl()}/mockorder/order/thank-you?session_id=${row.stripe_session}`);
    // Only Stripe's purchaser email is used. Gift recipients are never contacted.
    const sent = await sendMail(row.email, copy.subject, copy.text, copy.html, `mock-order-confirmation/${id}`);
    if (!sent.ok) throw new Error(sent.reason);
    await sql()`update mock_checkout_orders set email_status='sent',email_error='' where id=${id}::uuid`;
    return true;
  } catch (error) {
    await sql()`update mock_checkout_orders set email_status='error',email_error=${(error instanceof Error ? error.message : "Email failed").slice(0,200)} where id=${id}::uuid`;
    return false;
  }
}
export async function reconcileMock(run?: string) {
  await expireSimulatedOrders(run);
  const stripe = getMockStripe(); if (!stripe) return;
  const rows = run ? await sql()`select * from mock_checkout_orders where run_id=${run}::uuid and status in ('preparing','open') order by created_at limit 100` : await sql()`select * from mock_checkout_orders where status in ('preparing','open') order by created_at limit 100`;
  for (const raw of rows) {
    const row = raw as MockOrder;
    if(isSimulatedSnapshot(row.snapshot))continue;
    let session: Stripe.Checkout.Session | undefined;
    if (row.stripe_session) session = await stripe.checkout.sessions.retrieve(row.stripe_session);
    else {
      for await (const candidate of stripe.checkout.sessions.list({ created: { gte: Math.floor(new Date(row.created_at).getTime()/1000)-120 }, limit: 100 })) {
        if (isMockSession(candidate) && candidate.metadata?.order_id === row.id && candidate.metadata?.mock_run_id === row.run_id) { session = candidate; break; }
      }
      if (!session && (row.snapshot.sessionParams?.expires_at ?? Infinity) <= Date.now()/1000) await sql()`select release_mock_order(${row.id}::uuid)`;
    }
    if (!session || !isMockSession(session)) continue;
    await attachMock(row.id, session.id);
    if (session.payment_status === "paid") { const paid = await recordMock(session); if (paid) await emailMock(paid.id); }
    else await releaseMock(session);
  }
}
