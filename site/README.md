# Heaven's Harvest Pantry

The shop, the ordering, and the owner's private page. Next.js App Router,
Tailwind v4, TypeScript. Deployed to Vercel as `brandon-wunder/heavens-harvest-pantry`.

```bash
npm run dev     # local, http://localhost:3000
npm test        # unit and isolated API regression tests
npm run build   # production build
```

`npm test` runs plain `node --test` against the TypeScript directly. There is no
test framework and no build step; `scripts/alias.mjs` teaches Node the `@/`
shorthand. Anything a test imports must therefore stay free of runtime-only
dependencies.

## Where things live

| What | Where |
|---|---|
| The defaults for every price, flavor, verse and rule | `lib/content.ts` |
| Her saved edits, laid over those defaults | `lib/settings.ts` → Neon Postgres |
| The money | `lib/cart.ts`, validated in `lib/order.ts` |
| The owner's dashboard arithmetic | `lib/orders.ts`, read from Stripe in `lib/orders-source.ts` |
| Points | `lib/rewards.ts` + `lib/rewards-source.ts` |
| Reviews | `lib/reviews.ts` + `lib/reviews-source.ts` |
| Design tokens and the letterpress classes | `app/globals.css` |
| Repeated illustrations | one SVG sprite in `components/Sprite.tsx` |

Customer pages live in `app/(shop)/`, which brings the masthead and footer. The
owner's pages live in `app/owner/` and share `components/owner/Shell.tsx`.
`app/not-found.tsx` sits above both, so it imports its own chrome.

## Two rules worth keeping

**Nothing the browser says about money is trusted.** `app/api/checkout/route.ts`
re-prices every order from her current flavor list before it reaches Stripe, and
it validates the current menu, customer details, pickup selection and total before
reserving bake space or creating a payment session.

**The database is an overlay, never a requirement.** Every read goes through
`safely()` in `lib/db.ts`. An empty table, a cold database or a half-saved block
falls back to the built-in default for that block alone, so the site cannot be
taken down by the database.

## Schema

`node --env-file=.env.local scripts/migrate.mjs` — safe to run repeatedly.

## What is waiting on the owner

| Needed | Environment variable | Until then |
|---|---|---|
| Stripe embedded checkout | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Payment remains unavailable until all three are configured |
| Owner-approved tax treatment | `CHECKOUT_TAX_APPROVED=true`, `CHECKOUT_TAX_MODE`, and manual rate IDs when applicable | Payment stays disabled; missing tax settings never mean zero tax |
| Optional confirmation email (Resend) | `RESEND_API_KEY`, `MAIL_FROM` | Checkout remains available. Customers save their full on-screen receipt; failed emails remain visible for owner retry. |

Set them with `vercel env add`. To give Lauren access, run the database migration
and then `node --env-file=.env.local scripts/create-owner-invite.mjs`. It prints
a private, one-use setup link; she chooses her own password, stored only as a
scrypt hash in Neon.

## Ordering launch

The owner requested immediate opening on **October 7, 2026**. The order API and
basket are open, with no scheduled date restriction. The production address is
https://heavensharvestpantry.com; www redirects to this address.
The first pickup is **Friday, October 16**. Tuesday 9 p.m. Arizona time is the
weekly cutoff; Wednesday orders move to the following Friday. The API verifies
the pickup date and current menu prices before creating a payment session.
Customers with the former paused page open should refresh it.

Payment runs in Stripe's embedded Checkout iframe using the official Stripe.js
SDK. The installed server SDK uses API version `2026-08-26.dahlia` and
`ui_mode=embedded_page`; Stripe.js v10 uses `createEmbeddedCheckoutPage`.
Customer card data goes directly to Stripe. Only the publishable key enters the
browser build. Secret keys belong in sensitive Vercel Production variables.

The paid-order webhook is `/api/stripe/webhook`, listening for
`checkout.session.completed` and `checkout.session.async_payment_succeeded`.
It verifies Stripe's signature and records rewards only for paid sessions.
The owner dashboard groups porch pickup orders by the actual pickup date.

For approved fixed pickup taxes, set `CHECKOUT_TAX_MODE=manual` and the approved
`STRIPE_FOOD_TAX_RATE_ID` and `STRIPE_GIFT_JAR_TAX_RATE_ID`, then set
`CHECKOUT_TAX_APPROVED=true`. These are Stripe manual rates and do not activate
paid Stripe Tax. Use `CHECKOUT_TAX_MODE=none` only after the owner explicitly
confirms that no collection applies. A missing or incomplete decision blocks
payment. No tax registration is created automatically.

For the owner's confirmed Peoria porch pickup, packaged granola and candy
almonds taken home use the 1.6% city food rate (state/county food exemption).
The separately sold reusable gift jar uses the 8.1% Peoria/Maricopa combined
retail rate. Rates are exclusive: added once to the product prices. This setup
collects tax; it does not file returns or remit it to Arizona.
Sources: [Peoria rates](https://azdor.gov/model-city-tax-code/city-profile/peoria),
[food exemption](https://www.azleg.gov/ars/42/05102.htm),
[2026 state/county rates](https://selectmesa.com/business-environment/taxes/),
[container charges](https://azdor.gov/model-city-tax-code/articles-and-sections/retail-sales-sale-containers-paper-products-and-labels).
Owner-approved 3 oz sampler prices: granola $5, candied almonds $6. These are
saved in the live menu; full-size prices are unchanged.

`scripts/stripe-readiness.mjs` reads account readiness (or existing tax settings
with `mode=tax`). `scripts/stripe-provision.mjs` saves production keys and the
paid-order webhook. Both accept credentials only through hidden stdin JSON;
never pass credentials in shell arguments or commit them to source.

## Launch verification

See [LAUNCH-VERIFICATION.md](LAUNCH-VERIFICATION.md) for the October 8 release,
completed checks, local evidence and remaining verification limits.

`npm run build` compiles only. Database schema setup and historical-order handoff
are explicit maintenance commands and never run as part of a normal release.

Confirmation email is optional for launch. Stripe verification and recording the
paid order determine receipt status; email and a later status refresh cannot
hide a successfully verified payment. Pickup addresses stay private until paid.

`node scripts/launch-readiness.mjs` runs service checks only when
`HHP_LAUNCH_CHECK=1` is supplied to a Production build. Credentials stay inside
Vercel. It verifies live Stripe, approved tax rates, pickup and capacity, and the
existing webhook, adding its expiry-event subscription if missing. It also
replaces a legacy Vercel origin in saved label QR settings without changing copy.
An explicitly supplied `HHP_VERIFY_SESSION_ID` expires and releases only the
unpaid session whose customer marker is `Launch Verification 2026-10-08`.
Never use a real customer session for this check.
