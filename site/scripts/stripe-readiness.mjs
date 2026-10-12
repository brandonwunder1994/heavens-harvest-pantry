// Read-only account check. Supply {"key":"..."} on stdin, never an argument.
import Stripe from "stripe";

let input = "";
if (process.stdin.isTTY) process.stdin.setRawMode(true);
console.log("Ready for Stripe readiness JSON on stdin (input is hidden).");
for await (const chunk of process.stdin) {
  input += chunk;
  if (/[\r\n]/.test(input)) break;
}
if (process.stdin.isTTY) process.stdin.setRawMode(false);
try {
  const { key, mode } = JSON.parse(input);
  input = "";
  if (typeof key !== "string" || !/^(sk|rk)_(live|test)_/.test(key)) {
    throw new Error("Supply a Stripe secret or restricted key through stdin.");
  }
  const stripe = new Stripe(key, { timeout: 20000, maxNetworkRetries: 0 });
  if (mode === "tax") {
    const [settings, registrations] = await Promise.allSettled([stripe.tax.settings.retrieve(), stripe.tax.registrations.list({ limit: 100 })]);
    console.log(JSON.stringify({
      taxSettings: settings.status === "fulfilled" ? {
        status: settings.value.status,
        defaults: settings.value.defaults,
        city: settings.value.head_office?.address?.city,
        postalCode: settings.value.head_office?.address?.postal_code,
        state: settings.value.head_office?.address?.state,
        country: settings.value.head_office?.address?.country,
        missingFields: settings.value.status_details?.pending?.missing_fields,
      } : { error: settings.reason?.code ?? "unavailable" },
      registrations: registrations.status === "fulfilled" ? registrations.value.data.map((r) => ({ country: r.country, state: r.country_options?.us?.state, status: r.status })) : { error: registrations.reason?.code ?? "unavailable" },
    }, null, 2));
    process.exit(0);
  }
  const account = await stripe.accounts.retrieve();
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  console.log(JSON.stringify({
    account: account.id,
    name: account.business_profile?.name,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    currentlyDue: account.requirements?.currently_due,
    disabledReason: account.requirements?.disabled_reason,
    capabilities: account.capabilities,
    webhooks: endpoints.data.map(({ id, url, status, enabled_events }) => ({ id, url, status, events: enabled_events })),
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    error: error.type ?? "readiness_failed",
    code: error.code,
    message: String(error.message).replace(/(?:sk|rk)_(?:live|test)_[A-Za-z0-9]+/g, "[redacted]"),
  }));
  process.exitCode = 1;
}
