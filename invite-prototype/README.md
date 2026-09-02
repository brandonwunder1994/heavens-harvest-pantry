# Want to know Jesus?

Wave one of the plan. One quiet line at the bottom of every page, and the page
behind it: what she believes, what following Jesus actually looks like day to
day, and an open invitation to her family's church.

Nothing on the page is for sale, and nothing about the granola pages changes.

This folder is a **self-contained prototype**. It does not touch `site/`.

## See it

```
python -m http.server 8789 --directory .
```

then open <http://127.0.0.1:8789/index.html>. The invitation line as it appears
on every other page is at the very bottom, under the blessing.

`shots/` holds full-page stills at 1440 wide and on a phone.

## The one file that matters

**`church.json`.** Everything the church tells us lives there and nowhere else.

Any value left as `null` renders as a gold **"To come"** marker rather than a
guess. That is deliberate and it is not a placeholder to be tidied up later:
**never put an invented service time, address or kids' age range on a real
church's page.** Fill it in, and the page also stops saying it is waiting.

Still needed:

| | |
|---|---|
| The church's exact name | written here as **Pure Heart Church** — please confirm |
| Which campus | **Glendale** — confirmed 2 September 2026. Set by `homeCampus` in `church.json`; it sorts first and gets the "Where our family is" mark. Peoria still shows in full. |
| Sunday service times | |
| Midweek, if there is one | |
| Kids' ages and rooms | |
| Street address, map link, which door | |
| The church's own website | powers the "Plan a visit" button |

Once those land the page needs no code changes at all.

## How the two buttons behave

- **Plan a visit** goes to the church's own page, once we have the address for it.
- **Come with us this Sunday** sends her a short note, so somebody meets you at
  the door. That is the whole feature and it is the reason the page exists in
  this form rather than as a link.
- **Write privately** is the second door, for anyone not ready for a building.
  It reuses the private prayer line already planned for checkout — nothing new
  to build, nothing that appears on the site, nothing added to a mailing list.

Those three go live when her contact route does. Until then they are marked in
the prototype and go nowhere.

## Dropping it into the site

Five files, and nothing already there changes:

1. `church.json` → `content/church.json`
2. `KnowJesus.tsx` → `app/know-jesus/page.tsx`
3. `marks.tsx` → `app/know-jesus/marks.tsx`
4. `InviteLine.tsx` → `components/InviteLine.tsx`, rendered at the bottom of the
   site footer, under the blessing
5. `know-jesus.css` → imported once in the root layout

`know-jesus.css` is generated from the prototype and **every rule in it is
scoped under `.kj`**, so it cannot reach any other page. Edit `index.html` and
run `node build-css.mjs` to regenerate it; do not hand-edit the CSS.

The page is a server component: the church details are read at build time, so it
ships as plain HTML with nothing to fetch and nothing to wait for.

## Checked

Rendered in real Chrome at 1440×900 and 390×844 — no console errors, no sideways
scroll at either size, 44px minimum on everything tappable, visible keyboard
focus, and it prints cleanly with the navigation and buttons dropped.
