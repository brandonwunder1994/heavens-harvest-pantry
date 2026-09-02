# The Pour

The opening moment for Heaven's Harvest Pantry. A real glass jar on a warm
counter; granola falls into it, tumbles, settles, goes still; then the words
arrive. About two and a half seconds, once, on load.

This folder is a **self-contained prototype**. It does not touch `site/` and has
no dependency on it.

## See it

```
python -m http.server 8788 --directory .
```

then open <http://127.0.0.1:8788/index.html>. "Watch it again" replays it.

`shots/` holds stills of each beat, rendered in Chrome at 1440×900 and 390×844,
plus `still-*.png`: what each visitor who does not get the 3D actually sees.

Add `?still=no-webgl` (or `save-data`, `slow-network`, `small-device`) to the
URL to look at any of those cases on a machine that has none of the problems.

## How it works

The trick is that **no physics runs in the browser**.

`bake.mjs` drops 420 clusters into the jar here, on a laptop, with a real
settling simulation, and records only where each one comes to rest. Everything
cosmetic — the scatter of the falling stream, the spin, the squash on landing,
which shade of toast each piece is — is regenerated in the browser from the same
seed. So the pour is identical on every visit, costs a phone almost nothing, and
the recording is 3.4 KB.

```
node bake.mjs        # -> pour.json         (change SEED to shake the jar)
node bake-still.mjs  # -> still/*.webp      (the photograph, and its blurred ground)
node shots.mjs       # -> shots/*.png       (needs the server above running)
node shots-still.mjs # -> shots/still-*.png (and 26 assertions about the fallback)
```

Nothing in the scene is a downloaded asset. The counter, the label, the oat
flecks on each cluster and the kitchen light are all drawn in code, so there is
nothing to wait for and nothing to license. When her real photographs and a
captured kitchen light are available they drop straight in.

## Weight

| | gzipped |
|---|---|
| three.js (full build; a tree-shaken build is smaller) | 167 KB |
| `pour.js` | 6.7 KB |
| `pour.json` | 3.4 KB |
| **The pour, total** | **~177 KB** |
| | |
| `counter-wide.webp` | 26.4 KB |
| `counter-tall.webp` | 25.3 KB |
| the blurred ground, inside the stylesheet | 0.6 KB |
| **Instead of the pour** | **~27 KB** |

Loaded after the words, so the page reads immediately. One unoptimized photo
off a phone is eight times this. Nobody downloads both: the choice is made
before three.js is asked for, and the photograph is only fetched if the scene
is not going to arrive.

## Everything, without the graphics

On an old phone, a weak signal, or with motion switched off, the visitor gets a
**photograph of the same scene** — not a gradient, not an apology, and not a
smaller version of the site. `bake-still.mjs` renders the settled jar here, in
the kitchen, at both shapes the scene frames itself in, and freezes it at the
moment the granola stops moving. Measured against the live render, the two
frames differ by 0.4%.

The order is the whole point. `still.js` asks the question **before** three.js
is imported, so on the fallback path the 177 KB is never requested at all. A
fallback that only appears after the download has failed has already cost the
visitor the download.

Six reasons to hand over the photograph instead:

| | |
|---|---|
| Motion switched off | honoured by not downloading the moving thing, rather than downloading it and holding it still |
| No WebGL | the browser cannot draw it |
| Data Saver on | somebody telling us they pay by the megabyte |
| 2G or slower | `effectiveType` says so |
| An old, small phone | under 2 GB of memory, or two cores or fewer |
| The scene stalls past four seconds | the photograph is fetched *then*, and only then |

JavaScript switched off entirely gets the same page, from plain HTML.

While a capable browser is booting the scene, the ground is a twenty-pixel-wide
blurred copy of the same frame, inlined in the stylesheet. It costs no request,
it is there in the first paint, and it means there is no empty rectangle at any
point in any case.

`shots-still.mjs` proves all of this in a real browser: 26 assertions, including
that three.js is never requested on any fallback path, and that a capable
browser never downloads the photograph as well.

## Dropping it into the site

No changes to anything already there:

1. `npm i three` and `npm i -D @types/three`
2. copy `pour.js`, `still.js`, `ThePour.tsx` and `the-pour.css` into `components/hero/`
3. copy `pour.json` into `public/`, and the whole `still/` folder into `public/still/`
4. import both stylesheets once, in the layout:
   `import '@/components/hero/the-pour.css';`
   `import '@/public/still/lqip.css';`  ← or serve it with a `<link>`; it is generated
5. wrap the existing hero copy:

```tsx
import ThePour from '@/components/hero/ThePour';

<ThePour className="relative min-h-[86vh] overflow-hidden">
  <p className="eyebrow">Baked Thursday mornings in Vistancia</p>
  <h1>Made slow, in a real kitchen.</h1>
  {/* the existing call to action, untouched */}
</ThePour>
```

`pour.js` imports `three` by bare name, so it works unchanged under a bundler.
The standalone demo maps that name to the copy in `vendor/` with an import map.

`still.js` is plain JavaScript on purpose — it is imported by both the demo page
and the React component, so there is exactly one copy of the rule about who gets
the 3D. `allowJs` is already on in the site's `tsconfig.json`.

Re-run `node bake-still.mjs` whenever the scene changes, and commit what falls
out. A stale photograph is worse than none.

## Still to come

- Her real jar measured and modelled, and a photographed kitchen light in place
  of the drawn one. When that lands, re-run `bake-still.mjs`.
- The seal: on scroll, the lid goes on and the jar becomes the product card.
- Time of day. The light is a single warm key; pointing it by the visitor's own
  clock is roughly ten lines, and is its own idea on the Wow List.
