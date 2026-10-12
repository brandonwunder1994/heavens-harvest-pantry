# Owner portal extension review

This is an ordinary extension of Heaven's Harvest Pantry's established visual identity. It follows the owner surface's Operate brief: summarize business activity, expose the next action, and keep daily controls readable on a phone and computer.

## Evidence checked

- Product and surface authority: `PRODUCT.md` and `.impeccable/owner-brief.md`.
- Incumbent brand: `site/public/logo.webp` and the palette, typography, focus treatment, and component styles in `site/app/globals.css`.
- Owner implementation: `site/app/owner/owner.css`, layout, six primary pages, rewards and practice pages; `Shell`, `FlavorEditor`, `SaveBar`, `Work`, and `LabelEditor`; shared input styling in `site/lib/owner-ui.ts`.
- Preservation and retirement evidence: `site/app/owner/actions.ts`, `site/lib/settings.ts`, and `site/lib/shop-schema.ts`.
- Final recaptures viewed in `.impeccable/review/`: `dashboard-1366.png`, `products-390.png`, `labels-390.png`, `pickups-390.png`, `gifts-390.png`, and `settings-1366.png`. These supersede earlier captures at the same paths. The desktop navigation is visible; product saves follow their forms; the mobile label preview fits its surface; the pickup card contains pickup items; the gift card shows Friday delivery and recipient details.

This document records source and visual comparison. It does not certify production data, physical printed output, deployment, or automated test results.

## Comparison with the incumbent identity

The existing circular logo, cream work surface, brown navigation and actions, and sage accents remain recognizable. Global CSS remains the palette source: cream `#f4eee2`, paper `#fbf8f1`, brown `#5b3d1e`, deep brown `#3f2a14`, and sage `#6b7a4a`. Owner controls use the existing Karla UI family rather than the storefront's display serif. Printed label artwork retains its branded typography; the owner control override stays within `.owner-app`.

There is no root `DESIGN.md` or `.impeccable/design.json` in the checked tree. This is an existing documentation gap, not evidence that the brand is undefined. No replacement global system was created. The current owner stylesheet also contains local literal colors alongside global tokens; future system consolidation should be an explicit task, not an incidental extension change.

## Conventions for extending owner screens

- Reuse `OwnerShell` and `OwnerHeading`. Keep six primary destinations: Dashboard, Orders, Bake & pickup, Products & prices, Print studio, and Settings. Secondary tools inherit their parent selection.
- Preserve the desktop sidebar at 1024 px and above and the native Menu disclosure below it. Use the existing 220 px sidebar, bounded work area, and responsive single-column work panels.
- Use readable sans-serif controls, restrained borders and tonal surfaces, underlined sage links, and small status badges. Reuse shared inputs and the visible sage focus outline. Keep tabular figures for money, counts, and weights.
- Summarize before detail: four dashboard measures, compact product size prices, and one open product detail editor. At narrow widths, prices form three columns and the product name spans the row; responsive order tables become stacked rows.
- Keep `SaveBar` in document flow with pending, unsaved, and server-result feedback. Preserve navigation warnings for unsaved edits. Failed or unavailable reads must remain explicit, rather than appearing as zero totals or saved changes.
- Scale the visible label preview to its container while keeping the separate export artwork at the existing 640 × 384 px size. Keep the export copy offscreen and outside the accessible interface.
- Keep bake preparation, pickup completion, and anonymous gift delivery as focused views. Pickup items and gift items are filtered separately; gifts use the Friday bake date and recipient identity.

## Retained, moved, and retired inventory

| Disposition | Current treatment |
| --- | --- |
| Retained | Existing logo and palette; authentication and sign-out; owner and print routes; paid item facts used by order cards and labels; T50M Pro PNG and letter-sheet card formats. |
| Consolidated | Quick prices and availability live in Products & prices (`/owner/kitchen`), with recipes and label marks inside one product editor. Current 3, 8, and 16 oz prices are saved as `sizePrices`; legacy price aliases are derived on read. |
| Grouped | Bake list, Friday/Saturday pickup groups, and Friday blessing deliveries share Bake & pickup. Print studio links to the existing label, verse-card, thank-you-card, and QR tools. |
| Moved to secondary access | Pickup details, storefront message, verses, reviews, guide, practice orders, and historical rewards are reached through Settings. Practice orders also retain their Orders tab. |
| Paused or retired from editing | Rewards remain a read-only historical balance record. The save action refuses `jarRules`, `rewards`, and `delivery` edits while describing their historical settings as preserved. |

## Constraints carried forward

Preserve existing workspace changes and purchased history. Do not deploy production, delete historical records, or alter authentication, reward balances, tax configuration, payment rules, scheduling, or capacity as part of this design extension. The Tuesday 9 p.m. Arizona cutoff, shared 48 lb Friday/Saturday bake, refrigeration needs, and Friday Vistancia gift deliveries remain product constraints. Practice data must stay outside live sales, capacity, and fulfillment. Physical labels and cards still require a sample print before a batch.

## Delivery validation

357 unit tests pass, including Arizona boundaries, large-history totals and pagination, mixed recipients, canonical price validation, payment/snapshot deduplication, completion undo, and shared gift/Stripe calculations. TypeScript and an isolated Next build passed with payment, database, and email connections disabled. Lint has zero errors and one existing SoundSwitch accessibility warning outside this owner change.

The browser matrix covers nine owner screens at 1366 and 390 px with no horizontal overflow. Interaction checks cover one-open-product editing, unsaved navigation cancellation, rejected saves, recipient search, empty completed history, expired sessions, rejected completion actions, label snapshots for removed products, exact 640 by 384 PNG downloads, preserved print routes, and signed-out redirects. An isolated disconnected-service build confirmed unavailable reads do not masquerade as zero activity or editable real settings. No real payment, fulfillment update, live setting save, physical print, historical deletion, or production deployment was performed.

A fresh reviewer scored all five requested material fixes resolved and returned `ship` for that fix list. The local sample preview is http://localhost:3011/owner; choose Open sample preview. Its sign-in helper and sample data are development-only, and saving is disabled. Private help and its printable guide were updated with current sample screens.

## Production release

The user authorized production rollout with “ship it live.” Published and promoted deployment dpl_HdtSxPA3b6pX4sk78CkDcGeu6KcN on October 7, 2026 to https://heavensharvestpantry.com. The release used npx next build and did not run legacy setup or migration scripts. Production sign-in contains no sample-preview access. Live menu, blessing page, owner sign-in redirects, and unauthenticated action rejection passed checks. Previous production deployment dpl_F8czmQoZMoStZZDBFcK3gm9GVmtY remains available for rollback. No historical records were deleted.
