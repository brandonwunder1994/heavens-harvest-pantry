import fs from 'node:fs';
import {createHmac} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1100,height:800},deviceScaleFactor:1,reducedMotion:"reduce"});
const origin='http://127.0.0.1:3002';
const page=await context.newPage();
fs.mkdirSync('private/handoff',{recursive:true});fs.mkdirSync('output/playwright/handoff',{recursive:true});
await page.goto(origin+'/owner/login');await page.screenshot({path:'private/handoff/login.png'});
const expires=String(Date.now()+3600000);
const signature=createHmac('sha256','local-guide-session-for-sample-screens-only').update(expires).digest('hex');
await context.addCookies([{name:'hhp_owner',value:`${expires}.${signature}`,url:origin,httpOnly:true,sameSite:'Lax'}]);
for(const [image,route] of [['today',''],['fulfilment','/fulfilment'],['orders','/orders'],['settings','/settings'],['mock','/mock'],['kitchen','/kitchen'],['labels','/labels'],['qr','/qr'],['thank-you','/thank-you'],['verse','/verse'],['reviews','/reviews'],['rewards','/rewards'],['help','/help']]){
 await page.goto(origin+'/owner'+route,{waitUntil:'networkidle',timeout:120000});
 if(page.url().includes('/login'))throw new Error('Sample admin session did not open.');
 await page.locator('main').waitFor();await page.evaluate(()=>{document.querySelector('nextjs-portal')?.remove();});
 await page.screenshot({path:`private/handoff/${image}.png`});
 console.log('Captured sample '+image);
}
if(process.env.HHP_GUIDE_ONLY==='1'){await browser.close();process.exit(0);}
const checks=[];
for(const width of [1280,390]){
 await page.setViewportSize({width,height:900});
 for(const [name,route] of [['home','/'],['menu','/menu'],['pickup','/pickup'],['reviews','/reviews'],['bowl','/bowl'],['gifts','/blessing-bags'],['checkout','/checkout'],['owner','/owner'],['labels','/owner/labels'],['help','/owner/help']]){
  await page.goto(origin+route,{waitUntil:'networkidle',timeout:120000});
  await page.screenshot({path:`output/playwright/handoff/${name}-${width}.png`});
  checks.push({name,width,...await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,title:document.title}))});
 }
}
fs.writeFileSync('output/playwright/handoff/layout-checks.json',JSON.stringify(checks,null,2));
await browser.close();
console.log('Layout checks: '+JSON.stringify(checks.filter(c=>c.documentWidth>c.width)));
