// Inspect and expire only the unpaid session made by this launch check.
// Supply {key, sessionId} through hidden stdin; never creates a payment.
import assert from "node:assert/strict";
import Stripe from "stripe";
if (process.stdin.isTTY) process.stdin.setRawMode(true);
console.log("Ready for verification JSON on stdin (input is hidden).");
let input = "";
for await (const chunk of process.stdin) { input += chunk; if (/[\r\n]/.test(input)) break; }
if (process.stdin.isTTY) process.stdin.setRawMode(false);
try {
  const { key, sessionId } = JSON.parse(input); input = "";
  const stripe = new Stripe(key, { timeout: 20000, maxNetworkRetries: 0 });
  const account = await stripe.accounts.retrieve();
  assert.equal(account.id, "acct_1UECha5dmwkQeT55");
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });
  assert.equal(session.metadata.customer_name, "Launch Verification");
  assert.equal(session.payment_status, "unpaid");
  assert.equal(session.amount_subtotal, 1100);
  assert.equal(session.total_details.amount_tax, 18);
  assert.equal(session.amount_total, 1118);
  assert.equal(session.automatic_tax.enabled, false);
  console.log(JSON.stringify({ subtotal: session.amount_subtotal, tax: session.total_details.amount_tax, total: session.amount_total, paymentStatus: session.payment_status, automaticTax: session.automatic_tax.enabled }));
  if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
  console.log("Unpaid verification session expired. No payment was made.");
} catch (error) {
  console.error(JSON.stringify({ error: error.type ?? "verification_failed", code: error.code, message: String(error.message).replace(/(?:sk|rk|whsec)_(?:live_|test_)?[A-Za-z0-9]+/g, "[redacted]") }));
  process.exitCode = 1;
}
