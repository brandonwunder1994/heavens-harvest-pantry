// Apply the owner's confirmed pickup taxes and October 7 sampler prices.
// Run with --env-file=.env.local; supply the Stripe key through hidden stdin.
import Stripe from "stripe";
import { neon } from "@neondatabase/serverless";
import { spawn } from "node:child_process";
import path from "node:path";

if (process.stdin.isTTY) process.stdin.setRawMode(true);
console.log("Ready for launch JSON on stdin (input is hidden).");
let input = "";
for await (const chunk of process.stdin) {
  input += chunk;
  if (/[\r\n]/.test(input)) break;
}
if (process.stdin.isTTY) process.stdin.setRawMode(false);

async function saveEnvironment(name, value) {
  const cli = path.join(process.env.APPDATA, "npm", "node_modules", "vercel", "dist", "index.js");
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, "env", "add", name, "production", "--yes", "--force"], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    child.stdout.resume();
    child.stderr.resume();
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`Could not save ${name} (exit ${code}).`)));
    child.stdin.end(value);
  });
  console.log(`${name}: saved in Production`);
}

try {
  const { key } = JSON.parse(input);
  input = "";
  if (!/^sk_live_/.test(key ?? "") || !process.env.DATABASE_URL) throw new Error("Live Stripe and database credentials are required.");
  const stripe = new Stripe(key, { timeout: 20000, maxNetworkRetries: 1 });
  const account = await stripe.accounts.retrieve();
  if (account.id !== "acct_1UECha5dmwkQeT55" || !account.charges_enabled) throw new Error("The expected live account must be ready to charge.");
  const existing = await stripe.taxRates.list({ active: true, limit: 100 });
  async function rate(kind, percentage, jurisdiction) {
    const found = existing.data.find((r) => r.metadata.hhp_pickup_tax === kind && r.percentage === percentage && !r.inclusive && r.state === "AZ" && r.country === "US");
    if (found) return found;
    return stripe.taxRates.create({
      display_name: "Sales tax", description: kind === "food" ? "Peoria food for home consumption; state/county exempt" : "Peoria/Maricopa reusable gift jar retail: state 5.6%, county 0.7%, city 1.8%",
      percentage, inclusive: false, country: "US", state: "AZ", jurisdiction,
      tax_type: "sales_tax", metadata: { hhp_pickup_tax: kind, verified_on: "2026-10-07" },
    }, { idempotencyKey: `hhp-peoria-${kind}-${percentage}-20261007-v1` });
  }
  const food = await rate("food", 1.6, "Peoria, Arizona");
  const giftJar = await rate("gift_jar", 8.1, "Peoria / Maricopa County / Arizona");

  const sql = neon(process.env.DATABASE_URL);
  // One atomic partial edit preserves other chats' menu changes and every
  // full-size price. Refuse an unrecognized product rather than guess its price.
  const rows = await sql.query(`
    update settings set value = (
      select jsonb_agg(jsonb_set(f, '{samplerPrice}', to_jsonb(
        case when f->>'name' ~* '(candied|candy).*almond' then 6 else 5 end
      )) order by ord)
      from jsonb_array_elements(settings.value) with ordinality as e(f, ord)
    ), updated_at = now()
    where key = 'flavors' and jsonb_array_length(value) > 0
      and not exists (
        select 1 from jsonb_array_elements(value) f
        where f->>'name' !~* 'granola|(candied|candy).*almond'
      )
    returning value
  `);
  if (rows.length !== 1) throw new Error("The live menu contains an unrecognized product; sampler prices were not changed.");
  console.log(JSON.stringify({ samplerPrices: rows[0].value.map((f) => ({ name: f.name, samplerPrice: f.samplerPrice, bagPrice: f.bagPrice })) }));
  await saveEnvironment("STRIPE_FOOD_TAX_RATE_ID", food.id);
  await saveEnvironment("STRIPE_GIFT_JAR_TAX_RATE_ID", giftJar.id);
  await saveEnvironment("CHECKOUT_TAX_MODE", "manual");
  // Save approval last, after all dependencies are in place.
  await saveEnvironment("CHECKOUT_TAX_APPROVED", "true");
  console.log(JSON.stringify({ foodTax: food.percentage, giftJarTax: giftJar.percentage, automaticTax: "not enabled", status: "ready for deployment" }));
} catch (error) {
  console.error(JSON.stringify({ error: error.type ?? "launch_failed", code: error.code, message: String(error.message).replace(/(?:sk|rk|whsec)_(?:live_|test_)?[A-Za-z0-9]+/g, "[redacted]") }));
  process.exitCode = 1;
}
