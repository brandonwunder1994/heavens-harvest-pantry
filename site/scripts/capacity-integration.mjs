// Uses a fresh isolated schema. It never touches real batches or orders.
import {neon} from '@neondatabase/serverless';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const sql=neon(process.env.DATABASE_URL);
const schema='handoff_test_'+randomUUID().replaceAll('-','');
if(!/^handoff_test_[a-f0-9]{32}$/.test(schema))throw new Error('Invalid isolated schema');
await sql.query(`create schema ${schema}`);
try{
 const source=readFileSync(new URL('./order-schema.sql',import.meta.url),'utf8').replace(/\b(bake_batches|checkout_orders|reserve_bake_order|release_bake_order)\b/g,`${schema}.$1`).replaceAll(`${schema}.checkout_orders_bake_idx`,'checkout_orders_bake_idx');
 for(const statement of source.match(/(?:[^;$]|\$(?!\$)|\$\$[\s\S]*?\$\$)+;/g)??[])await sql.query(statement);
 const reserve=(id,oz,fingerprint=id)=>sql.query(`select * from ${schema}.reserve_bake_order($1::uuid,$2,'2099-01-02'::date,$3,'{}'::jsonb)`,[id,fingerprint,oz]);
 const attempts=Array.from({length:60},()=>randomUUID());
 const rows=await Promise.all(attempts.map(id=>reserve(id,16)));
 assert.equal(rows.filter(r=>r.length).length,48);
 const [batch]=await sql.query(`select * from ${schema}.bake_batches`);assert.equal(batch.reserved_oz,768);
 assert.equal((await reserve(randomUUID(),1)).length,0);
 const winner=rows.find(r=>r.length)[0];assert.equal((await reserve(winner.id,16)).length,1);
 assert.equal((await sql.query(`select * from ${schema}.bake_batches`))[0].reserved_oz,768);
 await assert.rejects(reserve(winner.id,16,'different'));
 await sql.query(`update ${schema}.checkout_orders set status='paid',pickup_done=true where id=$1::uuid`,[winner.id]);
 await sql.query(`select ${schema}.release_bake_order($1::uuid)`,[winner.id]);
 assert.equal((await sql.query(`select * from ${schema}.bake_batches`))[0].reserved_oz,768);
 const unpaid=rows.filter(r=>r.length)[1][0];
 await Promise.all([1,2,3].map(()=>sql.query(`select ${schema}.release_bake_order($1::uuid)`,[unpaid.id])));
 assert.equal((await sql.query(`select * from ${schema}.bake_batches`))[0].reserved_oz,752);
 assert.equal((await reserve(randomUUID(),16)).length,1);
 assert.equal((await sql.query(`select * from ${schema}.bake_batches`))[0].reserved_oz,768);
 console.log('PASS: 60 simultaneous reservations, exact 768 oz boundary, retries, conflicting attempts, paid completion, and repeated release.');
 // Exercise the real payment/email transitions against the isolated tables.
 // Only Stripe and the email provider are substituted; no email is sent.
 await sql.query(`create table ${schema}.settings(key text primary key,value jsonb)`);
 await sql.query(`insert into ${schema}.settings values('privatePickup','{"address":"Sample private pickup place","contact":""}')`);
 globalThis.__handoffSql=()=>((strings,...values)=>sql.query(strings.reduce((q,s,i)=>q+(i?'$'+i:'')+s,'').replace(/\b(checkout_orders|bake_batches|settings|reserve_bake_order|release_bake_order)\b/g,`${schema}.$1`),values));
 const provider=new Map();let requests=0,failNext=false;
 globalThis.__handoffSend=async(to,subject,text,html,key,from)=>{requests++;const body=JSON.stringify({to,subject,text,html,from});if(provider.has(key))assert.equal(provider.get(key),body);provider.set(key,body);if(failNext){failNext=false;return {ok:false,reason:'network'};}return {ok:true};};
 registerHooks({resolve(specifier,context,next){
  const sources={'server-only':'export {};','@/lib/db':'export const sql=()=>globalThis.__handoffSql();','@/lib/stripe':'export const getStripe=()=>null;','@/lib/mailer':'export const sendMail=(...args)=>globalThis.__handoffSend(...args);'};
  if(specifier in sources)return {url:'data:text/javascript,'+encodeURIComponent(sources[specifier]),shortCircuit:true};return next(specifier,context);
 }});
 process.env.RESEND_API_KEY='isolated-test-placeholder';process.env.MAIL_FROM='sample@example.com';process.env.NEXT_PUBLIC_SITE_URL='https://example.com';
 const store=await import('../lib/order-store.ts');
 const {defaultShop}=await import('../lib/content.ts');const {priceOrder}=await import('../lib/cart.ts');
 const lines=[{slug:defaultShop.flavors[0].slug,format:'bag',sizeOz:3,qty:1}];
 const totals=priceOrder(defaultShop,lines,{jarsReturned:0,blessingBags:0});
 const snapshot={order:{lines,jarsReturned:0,blessingBags:0,details:{bakeId:'2099-01-09',runDate:'2099-01-09',pickupPeriod:'morning',name:'Sample Customer',method:'dropoff'}},totals};
 const id=randomUUID();await sql.query(`select * from ${schema}.reserve_bake_order($1::uuid,$2,'2099-01-09',3,$3::jsonb)`,[id,id,JSON.stringify(snapshot)]);
 const session={id:'cs_isolated_test',status:'complete',payment_status:'paid',currency:'usd',amount_subtotal:500,amount_total:500,customer_details:{email:'sample@example.com'},metadata:{order_id:id}};
 assert.equal(await store.recordPaid({...session,payment_status:'unpaid'}),null);
 await assert.rejects(store.recordPaid({...session,amount_subtotal:1}));
 await store.recordPaid(session);await store.recordPaid(session);
 await assert.rejects(store.recordPaid({...session,id:'cs_wrong_session'}));
 assert.equal((await sql.query(`select reserved_oz from ${schema}.bake_batches where id='2099-01-09'`))[0].reserved_oz,3);
 await Promise.all(Array.from({length:15},()=>store.emailOrder(id)));assert.equal(requests,1);
 assert.equal((await store.getStoredOrder(id)).email_status,'sent');
 await store.emailOrder(id);assert.equal(requests,1);
 const retryId=randomUUID();await sql.query(`select * from ${schema}.reserve_bake_order($1::uuid,$2,'2099-01-09',3,$3::jsonb)`,[retryId,retryId,JSON.stringify(snapshot)]);
 await store.recordPaid({...session,id:'cs_isolated_retry',metadata:{order_id:retryId}});
 failNext=true;assert.equal(await store.emailOrder(retryId),false);assert.equal((await store.getStoredOrder(retryId)).status,'paid');
 await sql.query(`update ${schema}.settings set value='{"address":"Changed sample place","contact":""}'`);
 assert.equal(await store.emailOrder(retryId),true);assert.equal(provider.size,2);assert.equal(requests,3);
 const expiredId=randomUUID();await sql.query(`select * from ${schema}.reserve_bake_order($1::uuid,$2,'2099-01-09',3,$3::jsonb)`,[expiredId,expiredId,JSON.stringify(snapshot)]);
 await store.releaseExpired({...session,id:'cs_expired',metadata:{order_id:expiredId},status:'open',payment_status:'unpaid'});assert.equal((await store.getStoredOrder(expiredId)).status,'preparing');
 await store.releaseExpired({...session,id:'cs_expired',metadata:{order_id:expiredId},status:'expired',payment_status:'unpaid'});assert.equal((await store.getStoredOrder(expiredId)).status,'released');
 await assert.rejects(store.recordPaid({...session,id:'cs_expired',metadata:{order_id:expiredId}}));
 console.log('PASS: unpaid/mismatched payment rejection, repeated paid events, concurrent email claims, stable retry payload, and safe expiration.');
}finally{await sql.query(`drop schema ${schema} cascade`);}
