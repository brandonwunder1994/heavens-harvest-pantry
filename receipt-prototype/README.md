# The receipt

Phase one of the plan, and the second of its two pieces. The confirmation prints
like the ticket that goes up over her oven, with the week's verse below the
perforation.

People screenshot a beautiful receipt. Nobody has ever screenshotted a payment
confirmation email. This is the first thing every customer keeps.

Self-contained prototype. It does not touch `site/`.

## See it

```
python -m http.server 8792 --directory .
```

then <http://127.0.0.1:8792/index.html>. Four example orders, and a button that
really prints.

`shots/` holds each ticket, both screen sizes, and `printed.pdf` — the page as
it actually comes out of a printer.

## Where the numbers come from

Every figure on the ticket is read back from **the payment Stripe already
recorded**. Nothing is recalculated and nothing is stored twice, so the ticket
cannot drift from what was charged. The line items come from Stripe's own list
of them; the jars, the points and the delivery run come from the order details
already attached to the payment.

**The ticket number** is the last six characters of the payment's own id, split
for reading down a phone: `HH8-N4C`. She can paste it into Stripe's search and
land on the right order. Six characters is not unique across all time — it does
not need to be. It is the number on a ticket in a home kitchen, and the date
beside it settles any argument.

## The awkward case it gets right

A card cannot be charged nothing. So seven jars returned against one bag is
worth $14 of credit on a $13 order, and only $12 of it can come off.

Most receipts would quietly show the smaller number. This one says:

> $2.00 of your jar credit did not fit on this order — an order has to come to
> something.

It does not promise the rest carries over, because nobody has decided whether it
does. It states the fact and stops. **When that policy is settled, this is the
one line to change.**

## What it refuses to invent

- No delivery day recorded → "She bakes Monday and will text you when she sets
  out." It never names a day it was not told.
- No name → "For you", not a guessed one.
- Points not yet recorded → the running total is simply absent. The payment
  record can land a moment after this page does, and a zero would be a lie.
- Collection reads as collection; only a recorded delivery says "on your porch".

## Printing

Printing gives you **the ticket and nothing else on the page**: 78 millimetres
wide, black on white, one to a sheet. The torn edges and the punched holes are
left off, because those are paper, not ink.

This works without the site needing a print stylesheet of its own — the rules
use `:has()` to keep the ticket and its ancestors and drop everything else.
`printed.pdf` in `shots/` is the proof, produced by really printing the page.

## Dropping it into the site

Four files, and three small edits to files that already exist.

1. `receipt.ts` → `lib/receipt.ts`
2. `Receipt.tsx` → `components/Receipt.tsx`
3. `receipt.css` → `app/receipt.css`, imported once from `app/layout.tsx`
4. In `lib/order.ts`, add one line to `orderMetadata` so the ticket can tell
   what did not fit. Without it nothing breaks — the shortfall line just never
   appears:

```ts
jar_credit_asked_cents: String(totals.jarCreditRequestedCents),
```

5. In `app/(shop)/order/thank-you/page.tsx`, fetch the line items beside the
   session and build the ticket:

```tsx
const [session, items] = await Promise.all([
  stripe.checkout.sessions.retrieve(sessionId),
  stripe.checkout.sessions.listLineItems(sessionId, { limit: 50 }),
]);
const receipt = receiptFrom(session, items.data, shop.verseOfTheWeek, balance);
```

6. Replace the summary box, the verse block and the "thank you" copy on that
   page with `<Receipt receipt={receipt} />`. The heading, the "tell her how it
   was" link and the unpaid-order message all stay exactly as they are — the
   ticket replaces the middle of the page, not the page.

`Receipt` is a server component, so **no JavaScript reaches the browser for it**,
and every class is scoped under `.ticket` so it cannot restyle anything already
on the page.

## Checked

```
node build.mjs         # receipt.js, for the demo, compiled from receipt.ts
node check-receipt.mjs # 23 checks on the numbers and the wording
node shots.mjs         # 23 checks in real Chrome, the stills, and a real print
```

`receipt.ts` is the only copy of how a payment becomes a ticket. The demo runs
the compiled version of that same file, so the prototype cannot quietly disagree
with what will ship.

The 23 number checks cover the ordinary order, jars returned, the credit that
overflows the minimum charge, one jar reading as one jar rather than "1 jars",
and four kinds of half-formed payment: no metadata, no timestamp, no name, and
rubbish where a number should be. The 23 browser checks cover both screen sizes
and then **really print the page** and check what survived.

Two things that checking caught and fixed: the total set in the garamond's
old-style figures, where the 5 drops below the line and money reads unevenly;
and — in the test rather than the page — a visibility check that reported a
ticket as printing when its whole section was hidden.

## Still to come

- Whether unused jar credit carries over. One line changes when that is decided.
- If she ever wants the ticket emailed as well as shown, the same component
  renders to an image or a PDF without changes.
- Her real phone number replaces `[her number]` in the footer, along with every
  other placeholder, when she sends them.
