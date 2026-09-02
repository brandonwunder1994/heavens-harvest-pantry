# The porch light

Phase one of the plan. A small warm lamp in the strip at the top of every page:
lit when she is baking this week, out when she has sold out. She flips it from
her phone.

One glance answers the only question a returning customer has, and it makes the
shop feel staffed by a person rather than a server.

Self-contained prototype. It does not touch `site/`.

## See it

```
python -m http.server 8791 --directory .
```

then <http://127.0.0.1:8791/index.html>. Her switch on that page is live and
saves nowhere, so flip it as often as you like.

`shots/` holds stills of all three states and of her switch, rendered in Chrome
at 1440×900 and 390×844.

## The rule that matters

**A light she forgets goes out on its own.**

She bakes weekly. Three weeks of silence means the switch is not being flipped,
not that nothing has changed — so after **21 days** the lamp disappears and the
strip reads exactly as it did before this feature existed.

This is the case most versions of this idea get wrong, and it is the only one
that can actually cost her a customer: a lamp that has said *baking this week*
since April is worse than no lamp at all. Her own page warns her five days
before it happens, so it is never a surprise.

Three states, not two:

| | |
|---|---|
| **Lit** | she said she is baking, within the last 21 days |
| **Out** | she said she is sold out, within the last 21 days |
| **Nothing at all** | she has never flipped it, or has not in 21 days |

`TRUSTED_FOR_DAYS` in `porch.ts` is the one number to change.

## What she sees

Two buttons and a line of her own words, on the page she already uses. It shows
her the exact thing a customer will see **before** she saves it, and it saves
through the same button every other block on her page uses — nothing new to
learn and nothing new to trust.

Leaving her note empty is fine: the lamp then reads "Baking this week" or
"Sold out this week".

Flipping the switch **never rewrites her words** — it asks her whether they
still fit. "Baking Thursday, orders open" under an unlit lamp is exactly what
this feature exists to prevent, but guessing at what she meant instead is how a
light starts lying. So she is prompted, and she decides.

## Dropping it into the site

Five files, and three small edits to files that already exist.

1. `porch.ts` → `lib/porch.ts`
2. `PorchLight.tsx` → `components/PorchLight.tsx`
3. `PorchSwitch.tsx` → `components/owner/PorchSwitch.tsx`
4. `porch.css` → `app/porch.css`, imported once from `app/layout.tsx`
5. In `lib/content.ts`, add `porch` to the `Shop` type and to `defaultShop`:

```ts
import { noPorch, type Porch } from "@/lib/porch";
// Shop:        porch: Porch;
// defaultShop: porch: noPorch,
```

6. In `lib/settings.ts`, add `"porch"` to `editableKeys` and read it in
   `getShop` the way the other blocks are read:

```ts
porch: { ...noPorch, ...asObject(saved.get("porch")) },
```

7. In `components/Header.tsx`, put the lamp in the middle of the top strip,
   where the "Baked with prayer" line sits. It returns `null` when there is
   nothing honest to say, so the line stays as the fallback:

```tsx
{porchState(shop.porch).show
  ? <PorchLight porch={shop.porch} />
  : <span className="hidden md:inline">Baked with prayer in a home kitchen · {business.city}</span>}
```

8. On `app/owner/page.tsx`, drop `<PorchSwitch porch={shop.porch} />` in.

`PorchLight` is a server component, so **no JavaScript reaches the browser for
it**. Everything about the lamp is CSS, and every class is scoped under `.porch`
so it cannot restyle anything already on the page.

## Checked

```
node build.mjs        # porch.js, for the demo, compiled from porch.ts
node check-porch.mjs  # 17 checks on the decision itself
node shots.mjs        # 23 checks in real Chrome, and the stills
```

`porch.ts` is the only copy of the rule about who sees what. The demo page runs
the compiled version of that same file, so the prototype cannot quietly disagree
with what will ship.

The 17 decision checks cover the ordinary cases and the awkward ones: a garbled
date, a missing date, a clock running behind the save, and a forgotten *sold
out* as well as a forgotten *baking*. The 23 browser checks cover both screen
sizes, drive her switch the way she would, and hold both messages to a
readability floor — the "sold out" line is quiet by design, and quiet is one
step from illegible.

Three things that checking caught and fixed: hovering the button she had already
chosen laid cream text on a cream ground; "Sold out this week" was set in ink too
faint to read at 10px; and flipping to sold out left her old words sitting under
an unlit lamp with nothing to say so.

## Still to come

- The lamp is drawn in code. If she ever wants an actual porch light from her
  own house photographed, it swaps in without touching the logic.
- Nothing here knows about stock. If the menu ever tracks how many bags are
  left, "sold out" could set itself — but she should still be able to overrule
  it, because she is the one who knows whether she is baking.
