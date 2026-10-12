import {createHmac} from 'node:crypto';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const origin='http://127.0.0.1:3002';
 const context=await browser.newContext({viewport:{width:1100,height:900},acceptDownloads:true});
 const expires=String(Date.now()+3600000);
 const signature=createHmac('sha256','local-guide-session-for-sample-screens-only').update(expires).digest('hex');
 await context.addCookies([{name:'hhp_owner',value:`${expires}.${signature}`,url:origin,httpOnly:true,sameSite:'Lax'}]);
 const page=await context.newPage();
 await page.goto(origin+'/owner/labels',{waitUntil:'networkidle'});
 const flavor=page.getByLabel('Flavor',{exact:true});
 const choices=await flavor.locator('option').evaluateAll(options=>options.map(o=>({value:o.value,name:o.textContent})));
 fs.mkdirSync('output/playwright/handoff',{recursive:true});
 const results=[];
 for(const choice of choices){
  await flavor.selectOption(choice.value);
  for(const oz of [3,8,16]){
   await page.getByRole('button',{name:`${oz} oz`,exact:true}).click();
   const weight=await page.getByLabel('Net weight',{exact:true}).inputValue();
   assert.ok(weight.includes(`${oz} oz`));
   const overflow=await page.locator('[data-label-tone="print"]').evaluate(root=>{
    const box=root.getBoundingClientRect();
    return [...root.querySelectorAll('*')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&(r.bottom>box.bottom+1||r.right>box.right+1);}).map(el=>el.tagName+': '+el.textContent.slice(0,50));
   });
   assert.deepEqual(overflow,[],`${choice.name}, ${oz} oz overflows`);
   results.push({flavor:choice.name,oz,weight,overflow});
  }
  const omissions=page.getByRole('checkbox');
  for(let i=0;i<await omissions.count();i++)await omissions.nth(i).check();
  await page.locator('[data-label-tone="preview"]').screenshot({path:`output/playwright/handoff/label-${choice.value}.png`});
 }
 const order=page.getByLabel('Whose order this is',{exact:true});
 const gift=await order.locator('option').evaluateAll(options=>options.map(o=>({value:o.value,name:o.textContent})).find(o=>/sample recipient/i.test(o.name)));
 if(gift){await order.selectOption(gift.value);assert.ok(!(await page.getByLabel('Tracker code',{exact:true}).inputValue()).includes('DONOR'));}
 const downloaded=page.waitForEvent('download');
 await page.getByRole('button',{name:'Download PNG for T50M Pro',exact:true}).click();
 const download=await downloaded;
 await download.saveAs('output/playwright/handoff/printed-label.png');
 assert.equal(await download.failure(),null);
 fs.writeFileSync('output/playwright/handoff/label-checks.json',JSON.stringify(results,null,2));
 console.log(`PASS: ${results.length} purchased-size labels fit; applicable omission labels render; thermal PNG downloads.`);
} finally {await browser.close();}
