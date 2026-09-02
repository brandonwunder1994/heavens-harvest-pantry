# Heaven's Harvest Pantry

The shop, the ordering, and the owner's private page. Next.js App Router,
Tailwind v4, TypeScript. Deployed to Vercel as `brandon-wunder/heavens-harvest-pantry`.

```bash
npm run dev     # local, http://localhost:3000
npm test        # 46 unit tests over the money, the points and the reviews
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
it validates the order *before* it checks for payment keys, so a missing address
is reported as a missing address whatever Stripe's state.

**The database is an overlay, never a requirement.** Every read goes through
`safely()` in `lib/db.ts`. An empty table, a cold database or a half-saved block
falls back to the built-in default for that block alone, so the site cannot be
taken down by the database.

## Schema

`node --env-file=.env.local scripts/migrate.mjs` — safe to run repeatedly.

## What is waiting on the owner

| Needed | Environment variable | Until then |
|---|---|---|
| Her Stripe test key | `STRIPE_SECRET_KEY`, then `STRIPE_WEBHOOK_SECRET` | `/api/checkout` returns 503 and the button says payments are not switched on |
| An email sender (Resend) | `RESEND_API_KEY`, `MAIL_FROM` | Points still count on every order; looking them up says so plainly |

Set them with `vercel env add`. The owner's password is never in this repo:
Vercel holds a scrypt hash in `OWNER_PASSWORD_HASH`, as `salt:hash`.
