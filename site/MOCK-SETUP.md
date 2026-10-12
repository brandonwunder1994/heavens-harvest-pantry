# Private practice shop

Open `https://heavensharvestpantry.com/mockorder` through the existing owner login.
The **Mock orders** button opens `/mockorder/orders`, which holds completed
practice receipts. The previous `/mock` and `/owner/mock` links still work.
Start over creates a new run with independent 48 lb capacity
and an empty browser basket; previous receipts remain available.

## Connect services later

Save these privately in Vercel Production environment settings, then redeploy:

- `STRIPE_MOCK_SECRET_KEY`: Stripe test secret, beginning `sk_test_`.
- `STRIPE_MOCK_PUBLISHABLE_KEY`: matching test public key, beginning `pk_test_`.
- `STRIPE_MOCK_WEBHOOK_SECRET`: signing secret for the **test-mode** endpoint
  `https://heavensharvestpantry.com/api/mock/webhook`.
- `STRIPE_MOCK_FOOD_TAX_RATE_ID` and `STRIPE_MOCK_GIFT_JAR_TAX_RATE_ID`: exclusive
  test tax rates matching the currently approved production rates. Copy their
  percentages and jurisdiction into test mode; live IDs cannot be reused.
- `RESEND_API_KEY` and `MAIL_FROM`: Resend key and a verified sender address.

Subscribe the test webhook to `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, and `checkout.session.expired`.
The practice shop shares the explicit production tax approval/mode decision but
uses its own test tax IDs. It never assumes missing tax configuration means zero.
It never uses live credentials as a fallback. Enter the purchaser email in
Stripe test checkout; no gift recipient is emailed.

## Verification after connecting

Use test card `4242 4242 4242 4242`, a future expiry and any three-digit CVC.
For a declined card, use `4000 0000 0000 0002`. Verify ordinary, chocolate,
mixed and blessing orders; Friday/Saturday pickup; confirmation address and
table/fridge instructions; a MOCK email; and the receipt in Mock orders.
Retry the same checkout after a failed request. Expire a test session in Stripe
and retry; the practice reservation should release once. Resend a completed
test webhook twice; the receipt and email must remain single. Compare the real
owner totals and the real basket before and after. Never complete a live payment
as part of this check.

Mock records live only in `mock_runs`, `mock_bake_batches`,
`mock_checkout_orders`, and `mock_reviews`. The additive migration is idempotent
and runs during builds. No mock records are read by real reports or print lists.

## Build safety

Normal builds apply only the additive mock-table migration and compile the app.
The existing live order handoff is preserved as `npm run handoff:production` and
is deliberately excluded from builds because it changes live settings, sessions
and webhook configuration. Run that separate operational step only with the
owner's authorization.
