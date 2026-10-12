# Social prototype

The Social Media tab for the owner's page, before it is built for real.

    node build.mjs

`page.html` is the source: body-only, because that is what the Artifact host
wants. The build injects `../site/content/social-posts.json` at the `/*POSTS*/`
marker and writes two files:

* `artifact.html` — body-only, what gets published
* `index.html` — the same thing wrapped, opens off the disk

Never edit `artifact.html` or `index.html`; they are regenerated.

The hundred posts themselves are final and live in the site, not here.
The plan they belong to is `../SOCIAL-MEDIA-PLAN.md`.
