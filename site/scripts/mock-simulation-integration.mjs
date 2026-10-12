// Real Postgres and route handlers, with an isolated schema and fictional people.
import {neon} from '@neondatabase/serverless';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import assert from 'node:assert/strict';
const sql=neon(process.env.DATABASE_URL);
const schema='mock_sim_test_'+randomUUID().replaceAll('-','');
assert.match(schema,/^mock_sim_test_[a-f0-9]{32}$/);
const business=()=>sql`select (select count(*)::int from checkout_orders) orders,(select coalesce(sum(reserved_oz),0)::int from bake_batches) ounces`;
const before=await business();
await sql.query(`create schema ${schema}`);
try {
 const source=readFileSync(new URL('./mock-schema.sql',import.meta.url),'utf8').replace(/\b(mock_runs|mock_bake_batches|mock_checkout_orders|mock_reviews|reserve_mock_order|release_mock_order)\b/g,`${schema}.$1`);
 for(const statement of source.match(/(?:[^;$]|\$(?!\$)|\$\$[\s\S]*?\$\$)+;/g)??[])await sql.query(statement);
 globalThis.__simSql=()=>((strings,...values)=>sql.query(strings.reduce((q,s,i)=>q+(i?'$'+i:'')+s,'').replace(/\b(mock_runs|mock_bake_batches|mock_checkout_orders|mock_reviews|reserve_mock_order|release_mock_order)\b/g,`${schema}.$1`),values));
 globalThis.__simRun=randomUUID();
 await sql.query(`insert into ${schema}.mock_runs(id) values($1)`,[globalThis.__simRun]);
 registerHooks({resolve(specifier,context,next){
  const sources={
   'server-only':'export {};',
   '@/lib/db':'export const sql=()=>globalThis.__simSql();',
   '@/lib/mock-auth':'export const mockRun=async()=>globalThis.__simRun;export const uuid=x=>typeof x==="string"&&/^[a-f0-9-]{36}$/i.test(x);export const sameOrigin=r=>r.headers.get("origin")===new URL(r.url).origin;',
   '@/lib/settings':'export const readShop=async()=>({shop:globalThis.__simShop,live:true});',
   '@/lib/mock-stripe':'export const getMockStripe=()=>{throw new Error("Stripe must never be called by simulation")};',
   '@/lib/mailer':'export const sendMail=()=>{throw new Error("Simulation must never send email")};',
   '@/lib/order-store':'export const privatePickup=async()=>({address:"Sample private place",contact:""});',
  };
  if(specifier in sources)return {url:'data:text/javascript,'+encodeURIComponent(sources[specifier]),shortCircuit:true};
  return next(specifier==='next/server'?'next/server.js':specifier,context);
 }});
 const {defaultShop}=await import('../lib/content.ts');globalThis.__simShop=defaultShop;
 const {pickupDate,saturdayDate}=await import('../lib/fulfilment.ts');
 const {POST}=await import('../app/api/mock/simulate/route.ts');
 const store=await import('../lib/mock-store.ts');
 const call=(body,origin='https://example.com')=>POST(new Request('https://example.com/api/mock/simulate',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));
 const body={action:'prepare',attemptId:randomUUID(),expectedTotalCents:2700,lines:[{slug:'maple-pecan',format:'bag',sizeOz:8,qty:1,omissions:['apples']},{slug:'dark-chocolate-sea-salt',format:'bag',sizeOz:8,qty:1,gift:{id:'sample-gift',recipientName:'Sample Recipient',address:'Sample Vistancia address',inVistancia:true}}],details:{method:'dropoff',name:'Sample Neighbor',phone:'6235550100',runDate:saturdayDate(pickupDate()),pickupPeriod:'afternoon'},jarsReturned:0,blessingBags:0};
 assert.equal((await call(body,'https://other.example')).status,403);
 const run=globalThis.__simRun;globalThis.__simRun=null;assert.equal((await call(body)).status,401);globalThis.__simRun=run;
 assert.equal((await call({...body,expectedTotalCents:1})).status,409);
 const prepared=await Promise.all(Array.from({length:8},()=>call(body)));
 assert.ok(prepared.every(r=>r.status===200));
 const view=(await prepared[0].json()).simulation;assert.equal(view.totalCents,2754);
 assert.equal((await store.mockOrder(body.attemptId)).ounces,16);
 assert.equal((await store.mockOrder(body.attemptId)).snapshot.order.details.requiresCooling,false);
 const complete={action:'complete',orderId:body.attemptId,email:'practice@example.com',outcome:'success'};
 assert.equal((await call({...complete,outcome:'declined'})).status,402);
 assert.equal((await store.mockOrder(body.attemptId)).status,'preparing');
 assert.equal((await call({...complete,email:'bad'})).status,422);
 globalThis.__simRun=randomUUID();assert.equal((await call(complete)).status,404);globalThis.__simRun=run;
 const paid=await Promise.all(Array.from({length:8},()=>call({...complete,totalCents:1})));
 assert.ok(paid.every(r=>r.status===200));
 const saved=await store.mockOrder(body.attemptId);assert.equal(saved.status,'paid');assert.equal(saved.amount_cents,2754);assert.equal(saved.stripe_session,`sim_${saved.id}`);
 assert.equal(await store.emailMock(saved.id),true);assert.equal((await store.mockOrder(saved.id)).email_status,'pending');
 assert.equal((await sql.query(`select reserved_oz from ${schema}.mock_bake_batches`))[0].reserved_oz,16);
 const expired={...body,attemptId:randomUUID()};assert.equal((await call(expired)).status,200);
 await sql.query(`update ${schema}.mock_checkout_orders set snapshot=jsonb_set(snapshot,'{simulation,expiresAt}','1'::jsonb) where id=$1`,[expired.attemptId]);
 assert.equal((await call({...complete,orderId:expired.attemptId})).status,409);
 assert.equal((await store.mockOrder(expired.attemptId)).status,'released');
 assert.equal((await sql.query(`select reserved_oz from ${schema}.mock_bake_batches`))[0].reserved_oz,16);
 assert.deepEqual(await business(),before);
 console.log('PASS: actual simulation route; auth/origin/run isolation; concurrent retries; server totals; decline then success; omissions/mixed gifts; expiration; no Stripe or email; real production totals unchanged.');
} finally {await sql.query(`drop schema ${schema} cascade`);}
