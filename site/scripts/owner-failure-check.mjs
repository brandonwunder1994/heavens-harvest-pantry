// Run against the isolated non-production build with all service connections blank.
import { chromium } from 'file:///C:/Users/brand/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import { createHmac } from 'node:crypto';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-proxy-server'] });
try {
  const context = await browser.newContext();
  const expires = String(Date.now() + 3600000);
  await context.addCookies([{ name: 'hhp_owner', value: `${expires}.${createHmac('sha256', 'isolated-owner-failure-check').update(expires).digest('hex')}`, url: 'http://localhost:3012', httpOnly: true }]);
  const page = await context.newPage();
  await page.goto('http://localhost:3012/owner', { waitUntil: 'networkidle' });
  assert.ok(await page.getByText('Payments are not connected. Sales and orders are unavailable.', { exact: true }).isVisible());
  assert.equal(await page.getByText('Unavailable', { exact: true }).count(), 4);
  assert.ok(await page.getByText('Capacity could not load. Refresh before accepting or preparing orders.', { exact: true }).isVisible());
  await page.goto('http://localhost:3012/owner/orders', { waitUntil: 'networkidle' });
  assert.equal(await page.getByText(/No orders match/).count(), 0, 'failed reads cannot appear as an empty order book');
  await page.goto('http://localhost:3012/owner/kitchen', { waitUntil: 'networkidle' });
  assert.ok(await page.getByText('This is not your menu.', { exact: true }).isVisible());
  assert.equal(await page.getByRole('button', { name: 'Save products & prices', exact: true }).count(), 0);
  console.log('Unavailable payment/database reads remain explicit; sample values cannot be saved.');
} finally { await browser.close(); }
