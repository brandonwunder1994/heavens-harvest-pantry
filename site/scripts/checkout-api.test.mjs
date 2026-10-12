import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { randomUUID } from "node:crypto";
import { defaultShop } from "../lib/content.ts";
import { priceOrder } from "../lib/cart.ts";
import { pickupDate } from "../lib/fulfilment.ts";

const state = globalThis.__launchCheckout = {};
const modules = {
  "server-only": "export {};",
  "next/server": "export const NextResponse={json:(body,init)=>new Response(JSON.stringify(body),{...init,headers:{'Content-Type':'application/json',...init?.headers}})};",
  "@/lib/stripe": "export const getStripe=()=>globalThis.__launchCheckout.stripe; export const paymentsConfigured=()=>globalThis.__launchCheckout.configured;",
  "@/lib/settings": "export const readShop=async()=>({shop:globalThis.__launchCheckout.shop,live:globalThis.__launchCheckout.live});",
  "@/lib/db": "export const sql=()=>async()=>[{value:globalThis.__launchCheckout.capacityReady}];",
  "@/lib/order-store": `export const getStoredOrder=async()=>globalThis.__launchCheckout.stored;
    export const privatePickup=async()=>({address:globalThis.__launchCheckout.address});
    export const reconcileOpenOrders=async()=>{};
    export const reserveOrder=async(id,fingerprint,snapshot)=>{const s=globalThis.__launchCheckout;s.reserved++;return s.full?null:{id,fingerprint,snapshot};};
    export const attachSession=async()=>{}; export const releaseExpired=async()=>{};`,
};
registerHooks({ resolve(specifier, context, next) {
  if (specifier in modules) return { url: "data:text/javascript," + encodeURIComponent(modules[specifier]), shortCircuit: true };
  return next(specifier, context);
} });
const { POST } = await import("../app/api/checkout/route.ts");
beforeEach(() => {
  Object.assign(state, { shop: defaultShop, live: true, configured: true, capacityReady: true, address: "Private sample address", stored: null, reserved: 0, created: 0, full: false,
    stripe: { checkout: { sessions: { create: async () => { state.created++; return { id: "cs_test_isolated", status: "open", client_secret: "isolated-client-secret" }; } } } } });
  process.env.CHECKOUT_TAX_APPROVED = "true";
  process.env.CHECKOUT_TAX_MODE = "none";
  process.env.NEXT_PUBLIC_SITE_URL = "https://heavensharvestpantry.com";
  delete process.env.RESEND_API_KEY;
  delete process.env.MAIL_FROM;
});
const lines = [{ slug: defaultShop.flavors[0].slug, format: "bag", sizeOz: 8, qty: 1 }];
const input = () => ({ attemptId: randomUUID(), lines, expectedTotalCents: priceOrder(defaultShop, lines, { jarsReturned: 0, blessingBags: 0 }).totalCents,
  details: { name: "Sample Buyer", phone: "6235550100", method: "dropoff", runDate: pickupDate(), pickupPeriod: "morning" } });
const send = body => POST(new Request("https://heavensharvestpantry.com/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

test("a valid checkout creates a payment with no email-service configuration", async () => {
  const response = await send(input());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { clientSecret: "isolated-client-secret" });
  assert.equal(state.reserved, 1);
  assert.equal(state.created, 1);
});
test("invalid customer fields return validation errors before any reservation", async () => {
  const body = input(); body.details.name = ""; body.details.phone = "";
  const response = await send(body);
  assert.equal(response.status, 422);
  const result = await response.json();
  assert.ok(result.errors.name && result.errors.phone);
  assert.equal(state.reserved, 0);
});
test("changed prices and a full bake never create a payment", async () => {
  let response = await send({ ...input(), expectedTotalCents: 1 });
  assert.equal(response.status, 409); assert.equal((await response.json()).error, "price_changed");
  state.full = true;
  response = await send(input());
  assert.equal(response.status, 409); assert.equal((await response.json()).error, "bake_full");
  assert.equal(state.created, 0);
});
test("payment, tax, capacity, current-menu and pickup prerequisites remain enforced", async () => {
  for (const [field, value, error] of [["configured", false, "payments_not_configured"], ["capacityReady", false, "capacity_setup_pending"], ["live", false, "menu_unavailable"], ["address", "", "pickup_setup_pending"]]) {
    const original = state[field]; state[field] = value;
    const response = await send(input());
    assert.equal(response.status, 503); assert.equal((await response.json()).error, error);
    state[field] = original;
  }
  process.env.CHECKOUT_TAX_APPROVED = "false";
  const response = await send(input());
  assert.equal(response.status, 503); assert.equal((await response.json()).error, "tax_setup_pending");
  assert.equal(state.reserved, 0);
});
