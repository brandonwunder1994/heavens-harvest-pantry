import { chromium } from 'file:///C:/Users/brand/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const origin='https://heavensharvestpantry.com';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
try{
 const context=await browser.newContext({viewport:{width:1366,height:1000}});const page=await context.newPage();
 await page.goto(origin+'/owner/change-password');assert.ok(page.url().includes('/owner/login'));
 await page.getByLabel('Username',{exact:true}).fill('heavensharvestpantry');
 await page.getByLabel('Password',{exact:true}).fill('temp');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/owner');
 await page.getByRole('link',{name:'Change password',exact:true}).filter({visible:true}).click();
 await page.getByRole('heading',{name:'Change password',exact:true}).waitFor();
 await page.getByLabel('Username',{exact:true}).fill('heavensharvestpantry');
 await page.getByLabel('Current password',{exact:true}).fill('incorrect-password-verification');
 await page.getByLabel('New password',{exact:true}).fill('unused verification password');
 await page.getByLabel('Confirm new password',{exact:true}).fill('unused verification password');
 await page.getByRole('button',{name:'Change password',exact:true}).click();
 await page.getByRole('status').filter({hasText:'The username and current password did not match. Try again.'}).waitFor();
 await page.goto(origin+'/owner/change-password');
 await page.screenshot({path:'../.impeccable/review/password-live-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:1000});await page.locator('.owner-menu summary').click();
 assert.ok(await page.getByRole('link',{name:'Change password',exact:true}).filter({visible:true}).isVisible());
 await page.locator('.owner-menu summary').click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'../.impeccable/review/password-live-mobile.png',fullPage:true});
 console.log('PASS: live login, Change password menu/page, wrong-current-password rejection, mobile menu and layout. No password was changed.');
}finally{await browser.close();}
