# How this folder is produced

It is **generated**, not hand-maintained. The source of truth for the page is
`site/early-access/index.html`; this is that file re-pathed to sit at the root
of a site of its own, plus the assets it actually references.

    tools/site/build-early-access-standalone.py

Run that after any edit to `site/early-access/index.html`, or the two drift and
the deployed page silently falls behind the repository.

The differences the script makes, and why each exists:

- `../assets/…` → `assets/…`, because there is no parent directory here.
- The logo stops being a link and "About AceAiX" is removed: both pointed at
  the marketing home page, which is not part of this deploy. A link to a page
  that does not exist is worse than no link.
- `canonical`, `og:url` and `og:image` move from `aceaix.com/early-access` to
  the root of this site's own address.
- A `site.webmanifest` link is added, since the full site's `index.html`
  carried it and this page did not.
