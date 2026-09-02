# Monday's verse

Wave two of the plan, and the first thing on it. A new verse every Monday at
five in the morning, a wax seal on it until you have read it, and a wall of
every one that has come before.

It is the reason somebody opens the site in a week they are not buying granola.

Self-contained prototype. It does not touch `site/`.

## See it

```
python -m http.server 8790 --directory .
```

then <http://127.0.0.1:8790/index.html>.

## The one file she edits

**`verses.json`.** Nothing else, ever.

Which verse is showing is **worked out from today's date**, not stored anywhere
and not switched by anybody. There is no Monday morning task, no reminder to
miss, and no cron job to break.

**The list is a calendar.** There are fifty-two — one for each week of the year,
in order. The first is the week of New Year and the fifty-second is Christmas
week, so nobody sees a repeat inside a year, and the seasons stay put: Advent is
in December in 2026 and it is still in December in 2070. That is what
`"orderedBy": "calendar-week"` means, and it is why the order is not arbitrary.

- **Adding one in the middle moves everything after it by a week.** If she wants
  to add a verse, take one out of the same season, so the seasons stay where
  they are. Cut the list below fifty-two and it quietly falls back to a plain
  loop from `anchorMonday`, which still works but drifts out of season.
- **`pinned`** overrides everything and holds one verse on screen — for a
  bereavement, an exact Easter, or anything else worth staying on. Set it back
  to `null` and the rotation carries on where it would have been.
- **`changesAt`** is when Monday morning starts. Currently 05:00.
- **`anchorMonday`** is now only the week the site started; the wall counts back
  to it. It no longer decides which verse is showing.

### What the seasons do and do not do

Fixed dates are exact for good. Moving feasts mostly are:

| | |
|---|---|
| Christmas, New Year, Valentine's, Independence Day, the Arizona summer, harvest | exact, every year |
| Thanksgiving, Mother's Day, Labor Day, Advent | land on a verse written for them, every year |
| **Easter Sunday** | always lands on one of five weeks written about the cross and the resurrection |
| **Lent** | the one thing this cannot follow — it opens anywhere across five weeks, so weeks 9–11 are Lent-*shaped* rather than Lent-aligned |

`node check-seasons.mjs` proves all of that against every year from 2026 to 2070
and fails loudly if an edit knocks something out of season. Run it after any
change to the list.

### She has the last word on the words

The fifty-two are a **draft for her to approve**, not a decision made for her.
They are NIV, chosen for the season and for a granola kitchen; the intent is
that she reads them once and strikes any she would not have picked. Swapping one
for another inside the same season costs nothing and breaks nothing.

### And one to check

The text is the **New International Version**, credited at the foot of the page.
Quoting a verse a week with the translation named is ordinary and expected use.
If she would rather have no question about it at all, the **World English Bible**
is public domain and swaps in by editing the same file. Worth a minute of her
time before launch, not a blocker.

## What is here and what comes later

Working now, with no accounts and no database:

- This week's verse, changing on its own every Monday.
- The wax seal, which disappears once you have seen the week's verse. Held in
  your browser for now.
- The wall of every verse so far, newest first, with the date each landed.
- **Print this card** gives the 3.5 × 5 card that goes in the box.
  **Print every verse** gives the whole set as a booklet.
- The cross-and-wheat mark inks itself once, on a first visit, and never again
  after. That is a separate wave-one idea, done here because it belongs on this
  card. It stops still for anyone who has asked their device to reduce motion.

When phone sign-in lands, two things change and nothing else:

- The seal and the "already read" memory move from the browser to her account,
  so it follows a person across their phone and laptop.
- The wall becomes **theirs** — only the verses that came with their orders,
  each with the date it actually arrived — instead of the public rotation.

## Dropping it into the site

1. `verses.json` → `content/verses.json`
2. `verses.ts` → `lib/verses.ts`
3. The page markup and styles from `index.html` → `app/verses/page.tsx`

`lib/verses.ts` does all the date work on the server, so the page ships as plain
HTML. Only the seal and the inking mark need the browser, and both fail quietly
to "no seal, no animation" if it is unavailable.

## Checked

Rendered in real Chrome at 1440×900 and 390×844. No console errors, no sideways
scroll, and the clock was moved forward three Mondays in a row to prove the verse
actually advances: Ecclesiastes 4:9 → James 1:17 → Hebrews 10:24-25.

`node check-seasons.mjs` walks every year from 2026 to 2070 and checks that
twelve seasonal anchors still land on a verse that belongs to them. All twelve
hold.
