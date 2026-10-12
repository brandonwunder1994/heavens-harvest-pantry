import {createHmac} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({channel:'chrome',headless:true});
const sql=neon(process.env.DATABASE_URL),runs=[];
const origin='http://localhost:3004';
const results=[];
fs.mkdirSync('output/playwright/simulation',{recursive:true});
try {
 const anonymous=await browser.newContext();
 const denied=await anonymous.request.post(origin+'/api/mock/simulate',{headers:{origin},data:{action:'prepare'}});
 assert.equal(denied.status(),401);await anonymous.close();
 for(const width of [1100,390])for(const kind of ['ordinary','chocolate','mixed-gift']){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const expires=String(Date.now()+3600000),signature=createHmac('sha256','local-guide-session-for-sample-screens-only').update(expires).digest('hex');
  await context.addCookies([{name:'hhp_owner',value:`${expires}.${signature}`,url:origin,httpOnly:true,sameSite:'Lax'}]);
  const page=await context.newPage();const externalPayments=[];
  page.on('request',request=>{if(/api\.stripe\.com|checkout\.stripe\.com/.test(request.url()))externalPayments.push(request.url());});
  await page.goto(origin+'/api/mock/start',{waitUntil:'networkidle',timeout:120000});
  assert.equal(new URL(page.url()).pathname,'/mockorder');
  await page.getByRole('link',{name:'Mock orders',exact:true}).waitFor();
  const run=(await context.cookies()).find(c=>c.name==='hhp_mock_run')?.value;assert.match(run,/^[a-f0-9-]{36}$/);runs.push(run);
  const lines=[{slug:kind==='ordinary'?'maple-pecan':'dark-chocolate-sea-salt',sizeOz:8,format:'bag',qty:1,omissions:kind==='ordinary'?['apples']:['shredded-coconut']}];
  if(kind==='mixed-gift')lines.push({slug:'cinnamon-apple',sizeOz:8,format:'jar',qty:1,gift:{id:'sample-gift',recipientName:'Sample Recipient',address:'Sample Vistancia gift address',inVistancia:true,verseRef:'Psalm 34:8'}});
  await page.evaluate(({run,lines})=>{localStorage.setItem('hhp-cart-v1','live basket sentinel');localStorage.setItem(`hhp-mock-cart-v1:${run}`,JSON.stringify({lines,jarsReturned:0,blessingBags:0}));},{run,lines});
  await page.goto(origin+'/mockorder/checkout',{waitUntil:'networkidle',timeout:120000});
  await page.getByLabel('Your name',{exact:true}).fill('Sample Neighbor');await page.getByLabel('Phone number',{exact:true}).fill('6235550100');
  await page.getByRole('radio').nth(kind==='ordinary'?0:3).check();
  await page.getByRole('button',{name:'Continue to secure payment',exact:true}).click();
  await page.getByRole('heading',{name:'Practice payment',exact:true}).waitFor();
  await page.screenshot({path:`output/playwright/simulation/payment-${kind}-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Try a declined payment',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Practice decline'}).waitFor();
  await page.getByRole('button',{name:'Complete practice payment',exact:true}).click();
  await page.waitForURL(/\/mockorder\/order\/thank-you\?order_id=/,{timeout:60000});
  const receipt=await page.getByRole('region',{name:'Order receipt'}).textContent();
  assert.match(receipt,/SIMULATED PAYMENT/);assert.match(receipt,kind==='ordinary'?/porch table/:/porch fridge/);
  assert.match(receipt,kind==='ordinary'?/Friday/:/Saturday/);
  if(kind==='mixed-gift'){assert.match(receipt,/Sample Recipient/);assert.match(receipt,/Sample Vistancia gift address/);}
  await page.getByText('Preview confirmation email',{exact:true}).click();
  await page.getByText('Email preview only. No email was sent.',{exact:true}).waitFor();
  await page.waitForFunction(run=>JSON.parse(localStorage.getItem(`hhp-mock-cart-v1:${run}`)).lines.length===0,run);
  assert.equal(await page.evaluate(()=>localStorage.getItem('hhp-cart-v1')),'live basket sentinel');
  const documentWidth=await page.evaluate(()=>document.documentElement.scrollWidth);assert.ok(documentWidth<=width);
  await page.screenshot({path:`output/playwright/simulation/receipt-${kind}-${width}.png`,fullPage:true});
  await page.getByRole('link',{name:'Mock orders',exact:true}).click();
  await page.waitForURL('**/mockorder/orders');
  await page.getByRole('heading',{name:'Simulated payment is ready',exact:true}).waitFor();
  assert.ok((await page.getByRole('link',{name:'Reopen mock confirmation'}).count())>0);
  assert.equal(externalPayments.length,0);
  results.push({width,kind,documentWidth,declineThenSuccess:true,emailPreview:true,liveBasketUnchanged:true,stripeRequests:0});
  await context.close();
 }
 fs.writeFileSync('output/playwright/simulation/checks.json',JSON.stringify(results,null,2));
 console.log('PASS: desktop and phone; ordinary, chocolate and mixed gifts; decline then success; pickup and email previews; saved admin receipts; basket isolation; no Stripe calls or horizontal overflow.');
} finally {
 await browser.close();
 // Remove only the fictional runs this script created, leaving all other practice receipts alone.
 for(const run of runs){assert.match(run,/^[a-f0-9-]{36}$/);await sql`delete from mock_reviews where run_id=${run}::uuid`;await sql`delete from mock_checkout_orders where run_id=${run}::uuid`;await sql`delete from mock_bake_batches where run_id=${run}::uuid`;await sql`delete from mock_runs where id=${run}::uuid`;}
}
