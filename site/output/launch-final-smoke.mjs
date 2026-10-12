import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
const origin='https://heavensharvestpantry.com';
for(const path of ['/checkout','/sitemap.xml','/robots.txt']){const r=await fetch(origin+path);assert.equal(r.status,200);const s=await r.text();if(path==='/checkout'){assert.ok(!s.includes('email_setup_pending'));}if(path==='/sitemap.xml')assert.ok(s.includes(origin+'/menu'));if(path==='/robots.txt')assert.ok(s.includes('Disallow: /owner'));}
const www=await fetch('https://www.heavensharvestpantry.com/menu?check=launch',{redirect:'manual'});assert.equal(www.status,308);assert.equal(www.headers.get('location'),origin+'/menu?check=launch');
const menu=await(await fetch(origin+'/menu')).text();assert.ok(menu.includes('rel="canonical" href="'+origin+'/menu"'));
const bad=await fetch(origin+'/api/stripe/webhook',{method:'POST',headers:{'content-type':'application/json','stripe-signature':'invalid'},body:'{}'});assert.equal(bad.status,400);
const sql=neon(process.env.DATABASE_URL);
const records=await sql`select status,count(*)::int as count from checkout_orders where snapshot->'order'->'details'->>'name'='Launch Verification 2026-10-08' group by status`;
assert.ok(records.length>0);assert.ok(records.every(r=>r.status==='released'));
const capacity=await(await fetch(origin+'/api/capacity')).json();
console.log(JSON.stringify({customDomain:true,wwwRedirect:true,canonical:true,sitemap:true,robots:true,invalidWebhookRejected:true,unpaidVerificationOrders:records,capacity}));
