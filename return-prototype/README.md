# Reasons to come back

Phase two of the plan, all four of it. The shop stops being somewhere you go
when you need granola and starts being somewhere you check in on.

| | |
|---|---|
| **Welcome back** | the second visit greets you by name and offers your usual in one tap |
| **The jar shelf** | a shelf that gains a glass jar every time you bring one back |
| **Your verse wall** | every card that came in your boxes, in order, with its date |
| **Sunday morning note** | a short email in her voice that opens a page about you |

They are one folder because they are one page and one email, and all four read
from the same two things: what somebody has ordered, and their points.

Self-contained prototype. It does not touch `site/`.

## See it

```
python -m http.server 8793 --directory .
```

then <http://127.0.0.1:8793/index.html>. Three people to switch between: a
regular of seven months, somebody who has ordered twice, and somebody who has
never ordered at all.

## The state everybody skips

**Somebody who has just signed in and never ordered.** That is most people on
their first visit, and it is the state that usually renders as three empty
boxes.

Here each piece says something true instead:

- No usual to offer, and it says so, rather than showing a blank panel.
- The shelf is drawn empty with *"Bring a jar back and the first one lands
  here."* — an invitation, not an apology.
- The wall says where the first card comes from.
- The Sunday note leaves out points and shelf entirely, and the button says
  **Your page** rather than *your wall, your points and your shelf* — naming
  three empty things makes an email read like it was written for somebody else.

## Their usual, and how it is chosen

The basket they have ordered **most often**. Ties go to whichever they bought
most recently, so a habit that is changing is followed rather than argued with.

Somebody who has ordered twice, differently, is offered what they had last time
and told that is what it is: *"What you had last time, 3 weeks ago."* Never
*"your usual"*, because twice is not a habit.

## The Sunday note

Written as words, not pulled from a newsletter template. Three rules:

1. **It never says she is baking unless the porch light says so.** It takes the
   porch light's own answer, and *she has not said* is a real answer that
   produces silence rather than a guess.
2. **It never sends to somebody with nothing to read.** A weekly email that is
   sometimes empty teaches people to ignore it, and the first one they ignore is
   the last one they open.
3. **Tables and inline styles.** Email clients strip stylesheets. The note also
   reads perfectly as plain words with every style thrown away, which is what a
   good half of the world will actually get — the demo shows both.

The unsubscribe is in every one, top-level, and it is not optional.

## Dropping it into the site

Five files, and four small edits to files that already exist.

1. `account.ts` → `lib/account.ts`
2. `sunday-note.ts` → `lib/sunday-note.ts`
3. `ReturnPieces.tsx` → `components/rewards/ReturnPieces.tsx`
4. `return.css` → `app/return.css`, imported once from `app/layout.tsx`

5. In `lib/orders.ts`, carry the email through, so somebody's own orders can be
   found. One field on `Order`, one on `SessionLike`, one line in `toOrder`:

```ts
// SessionLike:  customer_details?: { email?: string | null } | null;
// Order:        email: string;
// toOrder:      email: (session.customer_details?.email ?? "").toLowerCase(),
```

6. In `lib/orders-source.ts`, a customer-scoped loader beside `loadOrders`.
   Stripe is already the order book, so this is the same call with a filter:

```ts
export async function ordersFor(email: string, days = 730): Promise<Order[]> {
  const result = await loadOrders(days);
  if (result.status !== "ok") return [];
  const clean = email.trim().toLowerCase();
  return result.orders.filter((o) => o.email === clean);
}
```

7. On `app/(shop)/rewards/me/page.tsx`, below the points, drop the three in:

```tsx
<WelcomeBack name={account.name} orders={orders} reorderHref={basketLink} />
<JarShelf orders={orders} />
<VerseWall orders={orders} verseFor={verseForWeekOf} />
```

`verseForWeekOf` is the shop's **own** weekly rotation, passed in rather than
copied, so the wall and the verse page can never disagree about which verse a
week had.

8. The Sunday note needs a route that runs weekly and an unsubscribe. The note
   itself is done — `sundayNote(input)` returns exactly what `sendMail` takes,
   in that order:

```ts
const note = sundayNote(input);
if (worthSending(input)) await sendMail(to, note.subject, note.text, note.html);
```

All three page pieces are server components, so **no JavaScript reaches the
browser** for any of them, and every class is scoped under `.rtn` so nothing
already on the page can be restyled.

## Checked

```
node build.mjs        # account.js and sunday-note.js, compiled from the .ts
node check-return.mjs # 56 checks on the decisions and the wording
node shots.mjs        # 26 checks in real Chrome, and the stills
```

`account.ts` and `sunday-note.ts` are the only copies of every rule here. The
demo runs the compiled versions of those same files, so the prototype cannot
quietly disagree with what will ship.

The 56 decision checks cover a regular, somebody with two different orders,
somebody with none, two orders landing in one week (they shared a card, so the
wall shows one), a negative jar count, and every singular-versus-plural in the
copy. The 26 browser checks walk all three people, both screen sizes, and hold
every line to a readability floor.

Four things checking caught and fixed:

- The shelf was built as fixed rows of fourteen jars, which looked right on a
  laptop and **hung three pixels off the side of a phone**. The planks are now
  painted by the stylesheet under however many jars fit.
- Two lines — the card dates and the reorder line — were set in ink too faint to
  read at their size.
- The Sunday note promised a shelf to somebody who had never returned a jar.
- One test expectation of mine was simply wrong: a customer with three free bags
  waiting *should* have that in the subject line ahead of the baking.

## Still to come

- The shelf draws seventy jars and puts the rest in the number. Somebody who
  gets past seventy has earned a nicer answer than that.
- The Sunday note needs a weekly schedule and an unsubscribe route; both are
  ordinary and neither changes anything here.
- The reorder button needs the basket link the shop already knows how to build.
