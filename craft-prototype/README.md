# The craft pass

Phase three of the plan, all four of it. Nothing new appears. Everything already
there stops looking cheap in the four ways people notice without knowing why.

| | |
|---|---|
| **Type that behaves** | headlines break in the right place, prices line up, nothing jumps as it loads |
| **Real paper** | the verse card is pressed into cotton stock, with grain, a deboss and ink that sinks in |
| **The oven timer** | a small kitchen timer instead of the spinner every app on earth has |
| **One sound, once** | a soft crunch into the basket, off until you switch it on |

Self-contained prototype. It does not touch `site/`.

## See it

```
python -m http.server 8794 --directory .
```

then <http://127.0.0.1:8794/index.html>. Every one of the four is shown beside
what it replaces.

## Type that behaves

Four things, and the first is the one that matters.

**Nothing jumps as the fonts load.** The page paints in a font already on the
machine, then the real one arrives and every line reflows. Measured here: one
line of the shop's own body copy is **966 pixels in Georgia and 848 in Cormorant
— 13.9% out**. That lurch is the single most cheap-looking thing a good-looking
site does, and everybody has seen it a thousand times without knowing what it
was.

The fix is not to hide the text until the font lands, which trades a jump for a
blank page. It is to squeeze the stand-in until it takes up almost exactly the
same room. `measure-fonts.mjs` measures both faces in Chrome and writes the
numbers out:

| Face | Fallback was | Squeezed to |
|---|---|---|
| Cinzel | 95.8% | 104.4% |
| Cormorant Garamond | 112.6% | 88.8% |
| Karla | 100.6% | 99.4% |

After that, the same line moves **1.1%** instead of 13.9%. Nothing there is
guessed; re-run the script if a face or a weight ever changes.

The other three: headlines balance to even lines (a real headline here goes from
a ragged edge of 165 pixels to 32); prices are set lining and tabular so a column
of them is a column; and quotation marks are told to hang outside the measure.

**One honest limit:** hanging punctuation is Safari-only today. Chrome and
Firefox ignore the line. It stays in because it costs nothing and is free where
it works — and forcing it everywhere would mean measuring a quote glyph and
pulling the first line back by hand, which breaks the moment the type size
changes.

## Real paper

Cotton stock, pressed. Three things separate paper from a beige rectangle, and
all three are drawn in code — **no image is fetched for any of it**:

- the fibre catches light unevenly,
- the press bit a few millimetres in, so the edge sits proud,
- the ink sank a hair into the surface instead of sitting on it.

The first version of this was invisible. It looked like restraint and it was
actually nothing: bare paper measured **zero** variation. It now measures **2
levels out of 255** — present, and nowhere near noise. That band is a test now,
so the texture cannot quietly disappear again.

## The oven timer

One SVG and one rotation. It winds down at a real rate rather than spinning
forever pretending to know how long is left, and then simply keeps waiting,
which is honest about the fact that nothing knows.

For somebody who has asked their device to keep still, it stops dead and the
words underneath say the same thing without moving.

## One sound, once

A short burst of filtered noise, built in the browser. No audio file to fetch,
no licence to buy, no eighty kilobytes for a fifth of a second.

Rendered offline and measured, it peaks at 9 milliseconds, is silent again by
86, sits at about 3.1 kilohertz, and never goes above a tenth of full scale. A
dry, brittle thing breaking, quietly.

Three rules, all tested:

1. **Off on a first visit. Always.** Nobody's first visit makes a noise.
2. **The choice is remembered**, and switching it off makes it silent again.
3. **Two presses inside 180 milliseconds are one crunch**, so a double-tap never
   stacks.

## Dropping it into the site

`type.css` is the one stylesheet here meant to be **global** — that is the whole
point of it. Everything else is scoped under its own class.

1. `fallback-fonts.css` → `app/fallback-fonts.css`, imported **first**
2. `type.css` → `app/type.css`, imported straight after
3. `craft.css` → `app/craft.css`
4. `crunch.ts` → `lib/crunch.ts`
5. `CraftPieces.tsx` → `components/CraftPieces.tsx`

Then:

6. `type.css` redefines `--font-display`, `--font-serif` and `--font-ui` to
   include the measured stand-ins. Import it **after** `globals.css` so it wins.
7. Put `<SoundSwitch />` wherever settings live, and call `basketCrunch()` from
   the basket's add handler. It decides for itself whether to make a noise, so
   the basket does not have to know anything about sound.
8. `<OvenTimer said="A moment" />` replaces any spinner.
9. `<Paper verse={shop.verseOfTheWeek} />` wraps the verse card.

`Paper` and `OvenTimer` need no JavaScript in the browser at all. `SoundSwitch`
is a client component, because a switch is a switch.

## Checked

```
node build.mjs         # crunch.js, for the demo, compiled from crunch.ts
node measure-fonts.mjs # fallback-fonts.css, measured in Chrome
node shots.mjs         # 39 checks in real Chrome, and the stills
```

The 39 checks measure rather than assert: the font drift with the fix and with
it taken out, the ragged edge of a headline before and after, the grain on bare
paper against bare paper without it, and the crunch's own waveform rendered
offline and inspected.

Four things that checking caught and fixed:

- **The paper texture was invisible.** It measured zero. It looked like taste
  and it was an absent feature.
- **The first font measurement was meaningless.** It compared block heights,
  which only move once the reflow is big enough to change the line count — so it
  reported no drift where there was 14%. Measuring one unwrapped line found it.
- **The demo's own before-and-after showed nothing** — both headlines wrapped
  identically at that width. Sweeping the widths found one where the difference
  is plain, and the caption now describes what actually happens.
- **A claim in a comment was simply wrong**: hanging punctuation is not
  supported in Chrome. Corrected, and the test now checks the rule ships rather
  than that Chrome honours it.

## Still to come

- The fallbacks assume Georgia and Arial. A Linux visitor with neither falls
  back to whatever serif they have, and gets the old behaviour — no worse than
  today, but not the fix either.
- The crunch is one sound. If a second is ever wanted, it should replace this
  one rather than join it.
