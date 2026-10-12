// Synthetic test-only records in mock_* tables; no real payment or email.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import Stripe from "stripe";
import { registerHooks } from "node:module";
registerHooks({resolve(specifier,context,next){if(specifier==="server-only")return {url:"data:text/javascript,export {};",shortCircuit:true};return next(specifier==="next/server"?"next/server.js":specifier,context);}});
process.env.STRIPE_MOCK_SECRET_KEY="sk_test_synthetic_integration_only";
process.env.STRIPE_MOCK_PUBLISHABLE_KEY="pk_test_synthetic_integration_only";
process.env.STRIPE_MOCK_WEBHOOK_SECRET="whsec_synthetic_integration_only";
process.env.RESEND_API_KEY="re_synthetic_integration_only";
process.env.MAIL_FROM="Practice <practice@example.invalid>";
const originalFetch=globalThis.fetch;
const deliveries=[];let refuse=true;
globalThis.fetch=async(input,options)=>{
  if(String(input)==="https://api.resend.com/emails") {
    deliveries.push(JSON.parse(options.body));
    return new Response(refuse?"Synthetic provider failure":"{}",{status:refuse?503:200});
  }
  return originalFetch(input,options);
};
const { POST: webhook }=await import("../app/api/mock/webhook/route.ts");
const { reserveMock,mockOrder,mockCapacity,emailMock }=await import("../lib/mock-store.ts");
const sql=neon(process.env.DATABASE_URL);
const stripe=new Stripe(process.env.STRIPE_MOCK_SECRET_KEY);
const runs=[randomUUID(),randomUUID()];
const bake="2099-01-02";
const snapshot={order:{lines:[{slug:"maple-pecan",format:"bag",sizeOz:16,qty:1}],details:{bakeId:bake}},totals:{lines:[]}};
async function realState() {
  // Hash business tables without returning customer details or secrets.
  const tables=await sql`select tablename from pg_tables where schemaname='public' and tablename !~ '^mock_' and tablename not in ('owner_auth','owner_accounts','handoff_settings_backup') order by tablename`;
  const state={};
  for(const {tablename} of tables) {
    if(!/^[a-z_]+$/.test(tablename))throw new Error("Unexpected table name");
    const [row]=await sql.query(`select count(*)::int as count,md5(coalesce(string_agg(row_to_json(t)::text,'|' order by row_to_json(t)::text),'')) as digest from "${tablename}" t`);
    state[tablename]=row;
  }
  return state;
}
const before=await realState();
try {
  for(const run of runs)await sql`insert into mock_runs(id) values(${run}::uuid)`;
  const attempts=Array.from({length:52},()=>randomUUID());
  const results=await Promise.all(attempts.map(id=>reserveMock(id,runs[0],id,snapshot)));
  assert.equal(results.filter(Boolean).length,48);
  assert.equal((await mockCapacity(runs[0],bake)).remainingOz,0);
  const paid=results.find(Boolean),unpaid=results.filter(Boolean)[1];
  assert.equal((await reserveMock(paid.id,runs[0],paid.id,snapshot)).id,paid.id);
  assert.equal((await mockCapacity(runs[0],bake)).remainingOz,0);
  await assert.rejects(reserveMock(paid.id,runs[0],"conflict",snapshot));
  const session={id:`cs_test_synthetic_${paid.id}`,object:"checkout.session",livemode:false,status:"complete",payment_status:"paid",amount_total:1626,total_details:{amount_tax:26},metadata:{practice:"true",mock_run_id:runs[0],order_id:paid.id}};
  async function deliver(object,type="checkout.session.completed",livemode=false,badSignature=false) {
    const payload=JSON.stringify({id:`evt_synthetic_${randomUUID()}`,object:"event",api_version:"2026-08-26.dahlia",livemode,type,data:{object}});
    const signature=stripe.webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_MOCK_WEBHOOK_SECRET});
    const response=await webhook(new Request("https://heavensharvestpantry.com/api/mock/webhook",{method:"POST",headers:{"stripe-signature":badSignature?"bad":signature},body:payload}));
    return response;
  }
  assert.equal((await deliver(session,undefined,false,true)).status,400);
  assert.equal((await deliver({...session,livemode:true},undefined,true)).status,400);
  assert.equal((await deliver({...session,metadata:{}})).status,400);
  assert.equal((await mockOrder(paid.id)).status,"preparing");
  assert.equal((await deliver(session)).status,200);
  assert.equal((await deliver(session)).status,200);
  assert.equal((await mockOrder(paid.id)).status,"paid");
  assert.equal((await mockOrder(paid.id)).tax_cents,26);
  assert.equal((await sql`select count(*)::int as n from mock_checkout_orders where stripe_session=${session.id}`)[0].n,1);
  assert.equal((await deliver({...session,status:"expired",payment_status:"unpaid"},"checkout.session.expired")).status,200);
  assert.equal((await mockOrder(paid.id)).status,"paid");
  const expired={...session,id:`cs_test_synthetic_${unpaid.id}`,metadata:{...session.metadata,order_id:unpaid.id},status:"expired",payment_status:"unpaid"};
  assert.equal((await deliver(expired,"checkout.session.expired")).status,200);
  assert.equal((await deliver(expired,"checkout.session.expired")).status,200);
  assert.equal((await mockCapacity(runs[0],bake)).remainingOz,16);
  assert.equal((await mockOrder(unpaid.id)).status,"released");
  const emailSession={...session,customer_details:{email:"purchaser@example.invalid"}};
  assert.equal((await deliver(emailSession)).status,200);
  assert.equal((await mockOrder(paid.id)).email_status,"error");
  refuse=false;
  assert.equal(await emailMock(paid.id),true);
  assert.equal((await mockOrder(paid.id)).email_status,"sent");
  assert.equal((await deliver(emailSession)).status,200);
  assert.equal(deliveries.length,2); // One refused attempt, one successful retry.
  assert.equal(deliveries[1].to,"purchaser@example.invalid");
  assert.match(deliveries[1].subject,/MOCK/);
  assert.match(deliveries[1].text,/\/mockorder\/order\/thank-you/);
  const fresh=randomUUID();await reserveMock(fresh,runs[1],fresh,snapshot);
  assert.equal((await mockCapacity(runs[1],bake)).remainingOz,752);
  assert.equal((await mockOrder(paid.id)).status,"paid");
  assert.deepEqual(await realState(),before,"Real business rows changed during practice integration checks");
  console.log("PASS: separate capacity, 52 concurrent reservations, exact limit, idempotent retries, conflicts, signed webhooks, live-event rejection, duplicate payment/expiry delivery, failed-email retry and delivery deduplication, preserved receipts, fresh-run capacity, and unchanged real business rows.");
} finally {
  for(const run of runs) {
    await sql`delete from mock_checkout_orders where run_id=${run}::uuid`;
    await sql`delete from mock_bake_batches where run_id=${run}::uuid`;
    await sql`delete from mock_runs where id=${run}::uuid`;
  }
}
