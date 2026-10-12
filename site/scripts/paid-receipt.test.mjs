import { test } from "node:test";
import assert from "node:assert/strict";
import { readPaidReceipt } from "../lib/paid-receipt.ts";
import { confirmationCopy } from "../lib/order-confirmation.ts";
import { defaultShop } from "../lib/content.ts";
import { priceOrder } from "../lib/cart.ts";

const lines = [{ slug: defaultShop.flavors[0].slug, format: "bag", sizeOz: 8, qty: 1 }];
const totals = priceOrder(defaultShop, lines, { jarsReturned: 0, blessingBags: 0 });
const stored = { id: "receipt-test", status: "paid", amount_cents: 1016, email_status: "error", snapshot: {
  totals, order: { lines, details: { name: "Sample Buyer", runDate: "2026-10-16", bakeId: "2026-10-16", pickupPeriod: "morning" } },
} };
const session = { status: "complete", payment_status: "paid", metadata: { order_id: stored.id } };
const pickup = { address: "Private sample pickup address", contact: "Sample contact" };
const services = (overrides = {}) => ({ retrieve: async () => session, recordPaid: async () => stored,
  privatePickup: async () => pickup, emailOrder: async () => false, getStoredOrder: async () => stored, ...overrides });

test("missing email preserves a verified receipt and full pickup details", async () => {
  const receipt = await readPaidReceipt("cs_test_receipt", services());
  assert.equal(receipt.paid, true);
  assert.equal(receipt.stored.status, "paid");
  const copy = confirmationCopy(receipt.stored.snapshot, receipt.pickup, 1016, 16);
  for (const text of ["$10.00", "$0.16", "$10.16", "Friday, October 16", "morning", "porch table", pickup.address]) assert.ok(copy.text.includes(text), text);
});

test("email throws and a failed refresh cannot hide a verified paid order", async () => {
  const fail = async () => { throw new Error("Isolated service failure"); };
  const receipt = await readPaidReceipt("cs_test_receipt", services({ emailOrder: fail, getStoredOrder: fail }));
  assert.equal(receipt.paid, true);
  assert.equal(receipt.stored, stored);
  assert.deepEqual(receipt.pickup, pickup);
});

test("unpaid, incomplete, practice, unrelated and unverifiable sessions never reveal pickup", async () => {
  for (const value of [{ ...session, payment_status: "unpaid" }, { ...session, status: "open" },
    { ...session, metadata: { practice: "true", order_id: stored.id } }, { ...session, metadata: {} }]) {
    let reads = 0;
    const result = await readPaidReceipt("cs_test_receipt", services({ retrieve: async () => value, privatePickup: async () => { reads++; return pickup; } }));
    assert.deepEqual(result, { paid: false });
    assert.equal(reads, 0);
  }
  assert.deepEqual(await readPaidReceipt("cs_test_receipt", services({ recordPaid: async () => { throw new Error("Payment mismatch"); } })), { paid: false });
  assert.deepEqual(await readPaidReceipt("cs_test_receipt", services({ recordPaid: async () => null })), { paid: false });
});

test("pickup lookup failure preserves paid status without disclosing an address", async () => {
  const receipt = await readPaidReceipt("cs_test_receipt", services({ privatePickup: async () => { throw new Error("Unavailable"); } }));
  assert.equal(receipt.paid, true);
  assert.equal(receipt.pickup, null);
  assert.equal(receipt.pickupUnavailable, true);
});

test("gift-only receipts do not look up or reveal the private pickup address", async () => {
  const gift = { id: "sample-gift", recipientName: "Sample Recipient", address: "Sample Vistancia delivery address", inVistancia: true };
  const giftLines = [{ ...lines[0], gift }];
  const giftTotals = priceOrder(defaultShop, giftLines, { jarsReturned: 0, blessingBags: 0 });
  const giftOrder = { ...stored, snapshot: { totals: giftTotals, order: { lines: giftLines, details: stored.snapshot.order.details } } };
  const receipt = await readPaidReceipt("cs_test_receipt", services({ recordPaid: async () => giftOrder, getStoredOrder: async () => giftOrder,
    privatePickup: async () => { throw new Error("Must never read pickup"); } }));
  assert.equal(receipt.paid, true);
  assert.equal(receipt.pickup, null);
  assert.equal(receipt.pickupUnavailable, false);
  const copy = confirmationCopy(giftOrder.snapshot, null, 1724, 24);
  assert.match(copy.text, /Sample Recipient/);
  assert.match(copy.text, /Sample Vistancia delivery address/);
  assert.doesNotMatch(copy.text, /Private sample pickup address/);
});
