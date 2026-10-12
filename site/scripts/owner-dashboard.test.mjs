import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dashboardSummary, arizonaWindow, filterOrders, bakeFor, pickupWaiting, giftsWaiting } from '../lib/owner-dashboard.ts';
import { defaultShop } from '../lib/content.ts';
import { checkBlock, mergeFlavors } from '../lib/shop-schema.ts';
import { priceOrder } from '../lib/cart.ts';
import { checkoutSessionParams } from '../lib/checkout-session.ts';
import { mergePurchasedOrders } from '../lib/owner-order-merge.ts';
const order = (patch = {}) => ({ id: 'paid', createdAt: 0, amountCents: 1001, name: 'Customer', phone: '6235550100', email: 'customer@example.com', runDate: '2026-10-16', items: [{ name: 'Granola', qty: 1, format: 'bag', sizeOz: 16 }], delivered: false, ...patch });
test('seven calendar days use Arizona midnight, including the UTC date boundary', () => {
  const now = Date.parse('2026-10-08T06:59:00Z');
  const w = arizonaWindow(now);
  assert.equal(new Date(w.start * 1000).toISOString(), '2026-10-01T07:00:00.000Z');
  const s = dashboardSummary([order({ createdAt: w.start }), order({ id: 'old', createdAt: w.start - 1 }), order({ id: 'future', createdAt: w.now + 10 })], now);
  assert.equal(s.count, 1); assert.equal(s.cents, 1001); assert.equal(s.previousCount, 1);
  assert.equal(arizonaWindow(Date.parse('2026-10-08T07:00:00Z')).start, w.start + 86400);
});
test('complete totals and paginated history include more than the former loading limits', () => {
  const now = Date.now();
  const orders = Array.from({ length: 1501 }, (_, index) => order({ id: String(index), createdAt: now / 1000 - 100, delivered: index % 2 === 0 }));
  assert.equal(dashboardSummary(orders, now).count, 1501);
  const page = filterOrders(orders, { status: 'all', page: 61 });
  assert.equal(page.total, 1501); assert.equal(page.pages, 61); assert.equal(page.orders.length, 1);
  assert.equal(filterOrders(orders, {}).total, 750);
  assert.equal(filterOrders(orders, { status: 'completed' }).total, 751);
});
test('mixed orders remain outstanding until pickup and all gift recipients are finished', () => {
  const mixed = order({ pickupDone: true, giftsDone: { one: true }, items: [order().items[0], { name: 'Gift', qty: 2, gift: { id: 'one', recipientName: 'Anna' } }, { name: 'Gift', qty: 1, gift: { id: 'two', recipientName: 'Beth' } }] });
  assert.equal(pickupWaiting(mixed), false); assert.equal(giftsWaiting(mixed), 1);
  assert.equal(filterOrders([mixed], { q: 'Beth' }).total, 1);
  assert.equal(bakeFor(order({ runDate: '2026-10-17' })), '2026-10-16');
});
test('current size prices validate without obsolete aliases and derive legacy prices on read', () => {
  const raw = { name: 'New granola', slug: 'stable-product', sizePrices: { 3: 5.25, 8: 10.75, 16: 17.99 } };
  assert.equal(checkBlock('flavors', [raw]).ok, true);
  const f = mergeFlavors([raw])[0];
  assert.equal(f.bagPrice, 17.99); assert.equal(f.jarPrice, 17.99); assert.equal(f.samplerPrice, 5.25);
  for (const invalid of ['', 0, -1, 0.001, 1000]) assert.equal(checkBlock('flavors', [{ ...raw, sizePrices: { ...raw.sizePrices, 8: invalid } }]).ok, false);
  assert.equal(mergeFlavors([{ ...raw, bagPrice: 1, jarPrice: 2, samplerPrice: 3 }])[0].bagPrice, 17.99);
  assert.equal(checkBlock('flavors', [raw, { ...raw, name: 'Other granola' }]).ok, false);
  assert.equal(checkBlock('blessingBag', {price: 0.001}).ok, false);
});

test('payment and stored rows deduplicate while snapshots preserve retired recipes and completion undo', () => {
  const lines = [{ slug: defaultShop.flavors[0].slug, format: 'bag', sizeOz: 8, qty: 1, omissions: ['apples'] }];
  const totals = priceOrder(defaultShop, lines, { jarsReturned: 0, blessingBags: 0 });
  const stored = { id: 'stored', stripe_session: 'paid', created_at: '2026-10-08T10:00:00Z', email: 'customer@example.com', amount_cents: 1080, pickup_done: true, gifts_done: {}, snapshot: { totals, order: { details: { name: 'Customer', phone: '', runDate: '2026-10-16' }, lines } } };
  const merged = mergePurchasedOrders([order(), order()], [stored]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].amountCents, 1080);
  assert.equal(merged[0].items[0].name, totals.lines[0].flavor.name);
  assert.deepEqual(merged[0].items[0].omissions, ['apples']);
  assert.equal(merged[0].delivered, true);
  assert.equal(mergePurchasedOrders([order()], [{ ...stored, pickup_done: false }])[0].delivered, false);
});
test('edited gift surcharge agrees across basket and Stripe while purchased snapshots stay intact', () => {
  const shop = { ...defaultShop, blessingBag: { ...defaultShop.blessingBag, price: 11.25 } };
  const lines = [{ slug: shop.flavors[0].slug, format: 'jar', sizeOz: 8, qty: 2, gift: { id: 'gift', recipientName: 'Recipient', address: 'Vistancia address', inVistancia: true } }];
  const options = { jarsReturned: 0, blessingBags: 0 };
  const snapshot = priceOrder(defaultShop, lines, options);
  const totals = priceOrder(shop, lines, options);
  const request = { lines, ...options, details: { name: 'Customer', runDate: '2026-10-16' } };
  const params = checkoutSessionParams(shop, request, totals, 'https://example.com', undefined, { foodRateId: 'txr_food', giftJarRateId: 'txr_jar' });
  assert.equal(totals.totalCents, 4250);
  assert.equal(params.line_items[1].price_data.unit_amount, 1125);
  assert.equal(params.line_items[0].price_data.unit_amount, 1000);
  assert.equal(params.line_items.reduce((sum, line) => sum + line.quantity * line.price_data.unit_amount, 0), totals.totalCents);
  assert.deepEqual(params.line_items[1].tax_rates, ['txr_jar']);
  assert.equal(snapshot.totalCents, 3400);
});
