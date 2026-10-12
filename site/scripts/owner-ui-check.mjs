// Local, isolated development preview: never connects to the production store.
import { chromium } from 'file:///C:/Users/brand/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const origin = 'http://localhost:3011';
const destination = '../.impeccable/review';
fs.mkdirSync(destination, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-proxy-server'] });
const context = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
const expires = String(Date.now() + 12 * 3600000);
await context.addCookies([{ name: 'hhp_owner', value: `${expires}.${createHmac('sha256', 'local-owner-preview-session-only').update(expires).digest('hex')}`, url: origin, httpOnly: true, sameSite: 'Lax' }]);
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('pageerror', e => console.log('Browser error:', e.message));
const checks = [];
for (const width of process.argv.includes('--interactions') ? [] : [1366, 390]) {
  await page.setViewportSize({ width, height: 1000 });
  for (const [name, route] of [['dashboard', '/owner'], ['products', '/owner/kitchen'], ['orders', '/owner/orders'], ['bake', '/owner/fulfilment'], ['pickups', '/owner/fulfilment?view=pickups'], ['gifts', '/owner/fulfilment?view=gifts'], ['print', '/owner/print'], ['settings', '/owner/settings'], ['labels', '/owner/labels?order=sample-older-order&item=0']]) {
    const response = await page.goto(origin + route, { waitUntil: 'networkidle', timeout: 120000 });
    assert.equal(response.status(), 200, `${name}: ${response.status()}`);
    assert.ok(!page.url().includes('/login'), name + ' authenticated');
    await page.evaluate(() => document.querySelector('nextjs-portal')?.remove());
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, `${name} overflows at ${width}`);
    checks.push({ name, width, overflow });
    await page.screenshot({ path: `${destination}/${name}-${width}.png`, fullPage: true });
    if (name === 'labels') {
      assert.equal(await page.getByLabel('Granola name', { exact: true }).inputValue(), 'Retired Honey Granola');
      assert.equal(await page.getByLabel('Ingredients', { exact: true }).inputValue(), 'Purchased oats, honey, almonds.');
    }
    console.log(`Checked ${name} ${width}`);
  }
}
await page.goto(origin + '/owner/kitchen', { waitUntil: 'networkidle' });
await page.setViewportSize({ width: 390, height: 1000 });
await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
await page.getByLabel('Product name', { exact: true }).waitFor();
assert.equal(await page.getByLabel('Product name', { exact: true }).count(), 1);
await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
assert.equal(await page.getByLabel('Product name', { exact: true }).count(), 1);
await page.getByLabel('3 oz', { exact: true }).first().fill('5.75');
assert.equal(await page.getByText('Not saved yet', { exact: true }).count(), 1);
page.once('dialog', dialog => dialog.dismiss());
await page.locator('.owner-menu summary').click();
await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
assert.ok(page.url().endsWith('/owner/kitchen'), 'unsaved navigation was cancelled');
await page.getByRole('button', { name: 'Save products & prices', exact: true }).click();
await page.getByText('Sample preview only. Changes are not saved.', { exact: true }).waitFor();
page.once('dialog', dialog => dialog.accept());
await page.goto(origin + '/owner/orders', { waitUntil: 'networkidle' });
await page.route('**/api/owner/order', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"not_signed_in"}' }));
await page.getByRole('button', { name: 'Mark picked up', exact: true }).first().click();
await page.getByText('Your sign-in expired. Open the page again.', { exact: true }).waitFor();
await page.unroute('**/api/owner/order');
await page.getByRole('button', { name: 'Mark picked up', exact: true }).first().click();
await page.getByText('That did not save. Please try again.', { exact: true }).waitFor();
await page.locator('select[name=status]').selectOption('completed');
await page.getByRole('button', { name: 'Find orders' }).click();
await page.getByText('No orders match these filters. Try all paid orders or clear your search.', { exact: true }).waitFor();
await page.locator('select[name=status]').selectOption('outstanding');
await page.getByLabel('Search', { exact: true }).fill('Recipient');
await page.getByRole('button', { name: 'Find orders' }).click();
await page.waitForURL(/q=Recipient/);
assert.equal(await page.getByRole('heading', { name: 'Sample Gift Giver', exact: true }).count(), 1);
assert.equal(await page.getByRole('heading', { name: 'Sample Neighbor', exact: true }).count(), 0);
await page.goto(origin + '/owner/labels?order=sample-mixed-order&item=1', { waitUntil: 'networkidle' });
assert.ok((await page.getByLabel('Tracker code', { exact: true }).inputValue()).startsWith('SAMPLE-'));
assert.equal(await page.getByLabel('Net weight', { exact: true }).inputValue(), 'Net Wt 3 oz (85 g)');
const downloadEvent = page.waitForEvent('download');
await page.getByRole('button', { name: /Download PNG/ }).click();
const downloaded = fs.readFileSync(await (await downloadEvent).path());
assert.equal(downloaded.readUInt32BE(16), 640);
assert.equal(downloaded.readUInt32BE(20), 384);
await page.getByText('Saved to your downloads. Open it in the Katasymbol app and print.', { exact: true }).waitFor();
for (const route of ['/owner/verse/print', '/owner/thank-you/print', '/owner/qr/print', '/owner/help', '/owner/rewards', '/owner/mock']) {
  const response = await page.goto(origin + route, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200, route);
}
assert.deepEqual(errors, []);
fs.writeFileSync(`${destination}/checks.json`, JSON.stringify({ checks: checks.length ? checks : JSON.parse(fs.readFileSync(`${destination}/checks.json`)).checks, interactions: 'passed', errors }, null, 2));
await context.clearCookies();
await page.goto(origin + '/owner/orders', { waitUntil: 'networkidle' });
assert.ok(page.url().includes('/owner/login'), 'signed-out access redirects');
await page.getByRole('button', { name: 'Open sample preview', exact: true }).click();
await page.waitForURL(origin + '/owner');
await browser.close();
console.log('Owner browser checks passed.');
