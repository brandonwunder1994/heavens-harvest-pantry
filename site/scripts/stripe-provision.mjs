// Provision the existing shop. Credentials arrive through hidden stdin only.
import Stripe from "stripe";
import { spawn } from "node:child_process";
import path from "node:path";

if (process.stdin.isTTY) process.stdin.setRawMode(true);
console.log("Ready for Stripe setup JSON on stdin (input is hidden).");
let input = "";
for await (const chunk of process.stdin) {
  input += chunk;
  if (/[\r\n]/.test(input)) break;
}
if (process.stdin.isTTY) process.stdin.setRawMode(false);

async function saveEnvironment(name, value, sensitive = true) {
  const cli = path.join(process.env.APPDATA, "npm", "node_modules", "vercel", "dist", "index.js");
  const args = [cli, "env", "add", name, "production", "--yes", "--force"];
  if (sensitive) args.push("--sensitive");
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    // Vercel's credential prompt/output is deliberately not copied to logs.
    child.stdout.resume();
    child.stderr.resume();
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`Vercel could not save ${name} (exit ${code}).`)));
    child.stdin.end(value);
  });
  console.log(`${name}: saved in Production${sensitive ? " as a sensitive variable" : ""}`);
}

try {
  const { key, publishableKey } = JSON.parse(input);
  input = "";
  if (!/^sk_live_/.test(key ?? "")) throw new Error("A live Stripe secret is required through stdin.");
  const stripe = new Stripe(key, { timeout: 20000, maxNetworkRetries: 1 });
  const account = await stripe.accounts.retrieve();
  if (account.id !== "acct_1UECha5dmwkQeT55") throw new Error("Stripe account does not match Heaven's Harvest Pantry.");
  await saveEnvironment("STRIPE_SECRET_KEY", key);
  const endpoint = await stripe.webhookEndpoints.create({
    url: "https://heavens-harvest-pantry.vercel.app/api/stripe/webhook",
    description: "Heaven's Harvest Pantry paid orders and rewards",
    enabled_events: ["checkout.session.completed", "checkout.session.async_payment_succeeded"],
    api_version: "2026-08-26.dahlia",
  }, { idempotencyKey: "hhp-production-paid-orders-webhook-v1" });
  if (!endpoint.secret) throw new Error("Stripe did not supply the new endpoint signing secret.");
  await saveEnvironment("STRIPE_WEBHOOK_SECRET", endpoint.secret);
  if (publishableKey) {
    if (!/^pk_live_/.test(publishableKey)) throw new Error("Publishable key must be live.");
    await saveEnvironment("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", publishableKey, false);
  }
  console.log(JSON.stringify({ webhook: endpoint.id, url: endpoint.url, status: endpoint.status, chargesEnabled: account.charges_enabled, payoutsEnabled: account.payouts_enabled, taxApproval: "unchanged" }));
} catch (error) {
  console.error(JSON.stringify({ error: error.type ?? "setup_failed", code: error.code, message: String(error.message).replace(/(?:sk|rk|whsec)_(?:live_|test_)?[A-Za-z0-9]+/g, "[redacted]") }));
  process.exitCode = 1;
}
