import { chromium } from 'file:///C:/Users/brand/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
const context=await browser.newContext();
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://localhost:3013/owner/change-password');
 assert.ok(page.url().includes('/owner/login'),'unauthenticated page redirects');
 await page.getByRole('button',{name:'Open sample preview',exact:true}).click();
 await page.waitForURL('**/owner');
 await page.goto('http://localhost:3013/owner/change-password');
 for(const [width,name] of [[1366,'desktop'],[390,'mobile']]){
  await page.setViewportSize({width,height:1000});
  await page.getByRole('heading',{name:'Change password',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(width===390){await page.locator('.owner-menu summary').click();assert.ok(await page.getByRole('link',{name:'Change password',exact:true}).last().isVisible());await page.locator('.owner-menu summary').click();}
  await page.evaluate(()=>document.querySelector('nextjs-portal')?.remove());
  mkdirSync('../.impeccable/review',{recursive:true});
  await page.screenshot({path:`../.impeccable/review/password-${name}.png`,fullPage:true});
 }
 await page.getByLabel('Username',{exact:true}).fill('owner');
 await page.getByLabel('Current password',{exact:true}).fill('temp');
 await page.getByLabel('New password',{exact:true}).fill('my new pantry password');
 await page.getByLabel('Confirm new password',{exact:true}).fill('my new pantry password');
 await page.getByRole('button',{name:'Change password',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Sample preview only. Changes are not saved.'}).waitFor();
 await page.goto('http://localhost:3013/owner/login?password=changed');
 // The signed-in sample redirects, so use a fresh context for the confirmation state.
 const signedOut=await browser.newPage();await signedOut.goto('http://localhost:3013/owner/login?password=changed');
 assert.ok(await signedOut.getByText('Your password has been changed. Sign in with your new password.',{exact:true}).isVisible());
 assert.deepEqual(errors,[]);
 console.log('PASS: signed-out redirect, desktop and mobile layout, menu, form submission, preview write guard, and success message.');
}finally{await browser.close();}
