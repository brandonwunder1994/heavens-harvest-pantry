// Exercise real owner authentication, settings and fulfilment against disposable tables.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { neon } from "@neondatabase/serverless";

const database = neon(process.env.DATABASE_URL);
const schema = "owner_test_" + randomUUID().replaceAll("-", "");
assert.match(schema, /^owner_test_[a-f0-9]{32}$/);
await database.query(`create schema ${schema}`);
try {
  const source = readFileSync(new URL("./order-schema.sql", import.meta.url), "utf8")
    .replace(/\b(bake_batches|checkout_orders|reserve_bake_order|release_bake_order)\b/g, `${schema}.$1`);
  for (const statement of source.match(/(?:[^;$]|\$(?!\$)|\$\$[\s\S]*?\$\$)+;/g) ?? []) await database.query(statement);
  await database.query(`create table ${schema}.settings(key text primary key,value jsonb,updated_at timestamptz default now())`);
  await database.query(`create table ${schema}.owner_auth(id integer primary key,username text,password_hash text,session_secret text,setup_token_hash text,setup_expires_at timestamptz)`);
  let cookie;
  globalThis.__launchOwnerCookies = { get: () => cookie ? { value: cookie } : undefined, set: (_name, value) => { cookie = value; }, delete: () => { cookie = undefined; } };
  globalThis.__launchOwnerSql = () => (strings, ...values) => database.query(
    strings.reduce((query, text, i) => query + (i ? "$" + i : "") + text, "")
      .replace(/\b(owner_auth|settings|checkout_orders|bake_batches|reserve_bake_order|release_bake_order)\b/g, `${schema}.$1`), values);
  const modules = {
    "server-only": "export {};",
    "@/lib/db": "export const databaseReady=true;export const sql=()=>globalThis.__launchOwnerSql();",
    "@/lib/handoff-sample": "export const guideSample=false;",
    "@/lib/stripe": "export const getStripe=()=>null;",
    "@/lib/mailer": "export const sendMail=async()=>({ok:false,reason:'not_configured'});",
    "next/headers": "export const cookies=async()=>globalThis.__launchOwnerCookies;",
    "next/cache": "export const revalidatePath=()=>{};",
    "next/server": "export const NextResponse={json:(body,init)=>new Response(JSON.stringify(body),{...init,headers:{'content-type':'application/json'}})};",
  };
  registerHooks({ resolve(specifier, context, next) {
    if (specifier in modules) return { url: "data:text/javascript," + encodeURIComponent(modules[specifier]), shortCircuit: true };
    return next(specifier, context);
  } });
  delete process.env.OWNER_USERNAME;
  delete process.env.OWNER_PASSWORD_HASH;
  delete process.env.OWNER_SESSION_SECRET;
  const auth = await import("../lib/owner-auth.ts");
  const password = randomBytes(18).toString("hex");
  await database.query(`insert into ${schema}.owner_auth(id,username,password_hash,session_secret) values(1,$1,$2,$3)`, ["isolated-owner", await auth.hashPassword(password), randomBytes(32).toString("hex")]);
  assert.equal(await auth.ownerConfigured(), true);
  assert.equal(await auth.verifyCredentials("isolated-owner", "wrong"), false);
  assert.equal(await auth.verifyCredentials(" ISOLATED-OWNER ", password), true);
  await auth.startSession();
  assert.equal(await auth.isSignedIn(), true);

  const { defaultShop } = await import("../lib/content.ts");
  const { priceOrder } = await import("../lib/cart.ts");
  const store = await import("../lib/order-store.ts");
  const { POST } = await import("../app/api/owner/order/route.ts");
  const { saveBlock } = await import("../app/owner/actions.ts");
  const { savePrivatePickup } = await import("../app/owner/pickup-actions.ts");
  const form = values => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };
  const previous = { ok: false, message: "" };
  assert.equal((await savePrivatePickup(previous, form({ address: "Isolated sample pickup place", contact: "Test contact" }))).ok, true);
  assert.equal((await store.privatePickup()).address, "Isolated sample pickup place");
  for (const [key, value] of [["flavors", defaultShop.flavors], ["labelTemplates", defaultShop.labelTemplates]]) {
    assert.equal((await saveBlock(previous, form({ key, value: JSON.stringify(value) }))).ok, true, key);
    assert.equal((await database.query(`select count(*)::int as count from ${schema}.settings where key=$1`, [key]))[0].count, 1);
  }
  assert.equal((await saveBlock(previous, form({ key: "flavors", value: "{}" }))).ok, false);
  const lines = [
    { slug: defaultShop.flavors[0].slug, format: "bag", sizeOz: 8, qty: 1 },
    { slug: defaultShop.flavors[0].slug, format: "jar", sizeOz: 8, qty: 1, gift: { id: "isolated-gift", recipientName: "Sample Recipient", address: "Sample Vistancia address", inVistancia: true } },
  ];
  const totals = priceOrder(defaultShop, lines, { jarsReturned: 0, blessingBags: 0 });
  const id = randomUUID();
  const snapshot = { order: { lines, jarsReturned: 0, blessingBags: 0, details: { name: "Isolated Buyer", phone: "6235550100", method: "dropoff", bakeId: "2099-01-02", runDate: "2099-01-02", pickupPeriod: "morning" } }, totals };
  await store.reserveOrder(id, id, snapshot);
  await store.recordPaid({ id: "cs_isolated_owner", status: "complete", payment_status: "paid", currency: "usd", amount_subtotal: totals.totalCents, amount_total: totals.totalCents, customer_details: { email: "isolated@example.com" }, metadata: { order_id: id } });
  const send = body => POST(new Request("https://example.com/api/owner/order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  for (const done of [true, false, true]) {
    assert.equal((await send({ orderId: id, action: "pickup", done })).status, 200);
    assert.equal((await store.getStoredOrder(id)).pickup_done, done);
    assert.equal((await send({ orderId: id, action: "gift", giftId: "isolated-gift", done })).status, 200);
    assert.equal((await store.getStoredOrder(id)).gifts_done["isolated-gift"], done);
  }
  assert.equal((await send({ orderId: id, action: "gift", giftId: "unrelated", done: true })).status, 422);
  assert.equal((await send({ orderId: id, action: "email" })).status, 502);
  assert.equal((await store.getStoredOrder(id)).status, "paid");
  await auth.endSession();
  assert.equal(await auth.isSignedIn(), false);
  assert.equal((await send({ orderId: id, action: "pickup", done: false })).status, 401);
  assert.equal((await savePrivatePickup(previous, form({ address: "Must not be saved" }))).ok, false);
  assert.equal((await store.privatePickup()).address, "Isolated sample pickup place");
  console.log("PASS: real owner credential/session checks, settings and label saves, pickup and gift completion/undo, failed-email feedback preserving paid status, and sign-out protection. Disposable data only; no customer messages.");
} finally {
  await database.query(`drop schema ${schema} cascade`);
}
