import assert from 'node:assert/strict';
const origin = process.argv[2];
if (!origin?.startsWith('https://')) throw new Error('Supply the HTTPS deployment origin.');
for (const path of ['/owner/login', '/menu', '/blessing-bags']) {
  const response = await fetch(origin + path);
  assert.equal(response.status, 200, path);
  const text = await response.text();
  if (path === '/owner/login') {
    assert.ok(text.includes('Username') && text.includes('Password'));
    assert.ok(!text.includes('Open sample preview'), 'sample access must stay disabled in production');
  }
  if (path === '/menu') assert.ok(text.includes('Apple Maple Pecan') && text.includes('Candied Almonds'));
  console.log(`${path}: 200`);
}
for (const path of ['/owner', '/owner/orders', '/owner/settings', '/owner/print', '/owner/fulfilment']) {
  const response = await fetch(origin + path, { redirect: 'manual' });
  assert.ok([302, 303, 307, 308].includes(response.status), path);
  assert.ok(response.headers.get('location')?.includes('/owner/login'), path);
  console.log(`${path}: protected by sign-in`);
}
const action = await fetch(origin + '/api/owner/order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
assert.equal(action.status, 401);
console.log('Owner actions reject unauthenticated requests.');
