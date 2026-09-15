# The AceAiX website

A static site. No build step, no framework, no `npm install` — the whole thing
is one HTML file plus a folder of images.

```
index.html               the site
early-access/index.html  the sign-up page, at /early-access
early-access-standalone/ the same page as a site of its own — see below
assets/                  screenshots, logo marks, icons, the social image
site.webmanifest         icons and colours for "add to home screen"
robots.txt               crawlers
sitemap.xml              the two pages
_headers                 caching, for Netlify and Cloudflare Pages
vercel.json              caching, for Vercel
```

**`early-access-standalone/` is generated**, by
`tools/site/build-early-access-standalone.py`. It is the early-access page
re-pathed to sit at the root of its own small site, for deploying the sign-up
page without the marketing site around it. Edit
`site/early-access/index.html` and re-run the script; never edit the generated
copy, which is silently overwritten. `--check` fails if the two have drifted.

---

## Put it online

Any host that serves files will do. Three that need nothing else:

**Netlify** — drag the whole folder onto <https://app.netlify.com/drop>. Live in
about ten seconds, on a `*.netlify.app` address. Add `aceaix.com` under
Domain settings when you are ready.

**Vercel** — from a terminal, in this folder:

```bash
npx vercel --prod
```

**Cloudflare Pages** — Workers & Pages → Create → Pages → Upload assets, then
drop the folder in. Free, and fast in the Gulf specifically, which matters here.

**Your own hosting** — upload the contents of this folder to the web root
(`public_html`, `www`, or whatever your panel calls it). Nothing to configure.

Whichever you choose, `index.html` must sit at the root, with `assets/` beside
it — the page uses relative paths, so it also works if you open `index.html`
straight off your desktop.

---

## Where the sign-ups go

Both forms — "Be told the day it lands" on the front page, and the whole of
`/early-access` — can post to either of two places. **Nothing needs to be
configured for the simple one.**

**Netlify Forms, the default.** Drag the folder onto Netlify and sign-ups
start arriving with no further setup: they appear under **Forms** in the site
dashboard, as `launch-notify` and `early-access`, and Netlify emails each one
to whoever you list under *Form notifications* — put `masi.k@aryaix.com` there.
Export the whole list as CSV from the same screen. The free tier covers 100
submissions a month.

Netlify reads the form markup **at deploy time**, not when somebody submits, so
the `name`, `data-netlify` and hidden `form-name` attributes must survive any
edit to the `<form>` tags. A form that loses them stops being captured
silently — the page still says thank you and nothing is stored.

**A Supabase edge function, when you want more.** Paste its URL into the marked
`<script>` block just after `<body>` — in **both** files, they are set
independently:

```html
<script>window.ACEAIX_NOTIFY_URL = 'https://<project-ref>.supabase.co/functions/v1/waitlist-subscribe';</script>
```

Filling it in switches that page over. Nothing else changes, and it can be
emptied again. What it adds is the part a form cannot do on its own: a
confirmation email that proves the address is real, a database that **refuses**
a minor's row unless it carries a parent's address, and rate limiting. On the
Netlify route the early-access form still asks whether the person is under 18
and labels the submission accordingly, but nothing enforces it.

Because the pages say different things depending on which route is live, the
confirmation wording follows: only the Supabase route tells somebody to go and
check their inbox, because only it sends anything.

There is no Supabase key on either page and there should never be one: the page
never talks to the database, the function does. `docs/25-the-waitlist.md`
explains why, and covers the guardian rule and the campaign-tool setup.

---

## Four things to change before launch

**1. The store badges are placeholders.** The App Store and Google Play buttons
currently use simple glyphs I drew. Apple and Google both publish official badge
artwork with rules about size, wording and clear space, and a hand-drawn version
of someone else's trademark is both wrong and against their guidelines.

- Apple: <https://developer.apple.com/app-store/marketing/guidelines/>
- Google: <https://play.google.com/intl/en_us/badges/>

Download both, drop them in `assets/`, and in `index.html` replace the `<svg>`
inside each `.store` link with `<img src="assets/badge-appstore.svg" alt="Download on the App Store">`.
The buttons are already sized for them.

**2. The App Store link points at the UAE storefront.**

```
https://apps.apple.com/ae/app/aceaix/id6785269968
```

Remove `/ae` and Apple redirects each visitor to their own country's store.
Keep it if the launch is deliberately Gulf-first.

**3. Both store pages will 404 until the app is actually published.** Store
listings do not go live before the app does. If you would rather not have two
dead buttons until 1 October, say so and they can be disabled until the
countdown reaches zero, then activate themselves.

**4. Deep links need two files you have to generate.** So that tapping an
`aceaix.com` link on a phone opens the app rather than the website, the site
must serve:

- `/.well-known/apple-app-site-association` — needs your Apple **Team ID** and
  the bundle id `com.aryaix.aceaix.athlete`, served as `application/json` with
  no file extension
- `/.well-known/assetlinks.json` — needs the **SHA-256 fingerprint** of the
  signing certificate from Play Console → Setup → App integrity

Both are in `docs/15-known-gaps.md` in the app repository as outstanding items.
They are not in this package because inventing a fingerprint would produce a
file that silently fails.

---

## Changing things

**The launch date** is in one place, near the bottom of `index.html`:

```js
var LAUNCH = Date.UTC(2026, 8, 30, 20, 0, 0);
```

That is midnight on 1 October 2026 **in Dubai**, written in UTC so it means the
same instant everywhere. The month is zero-based, which is why September is `8`.
Change it and the countdown, the hero pill and the closing section all follow.

When the date passes, the countdown hides itself and the page switches to
"Out now" on its own. Nobody has to edit anything on launch morning.

**The colours** are CSS custom properties in the first eighty lines, taken from
`mobile/theme/tokens.ts` in the app repository so the site and the app stay the
same object. Dark is the default and light overrides it. Change a value in both
the `@media (prefers-color-scheme: light)` block **and** the
`:root[data-theme="light"]` block, or the theme switch and the operating system
will disagree.

**The screenshots** are regenerated from the real app, never mocked:

```bash
cd mobile && npm run preview          # builds the app with recorded data
node tests/e2e/site-shots.mjs         # walks it and shoots each screen
```

They land in `mobile/tests/e2e/site-shots/`. Downscale to 380px wide and replace
the files in `assets/`.

---

## What is on the page

Hero · the Talent Score, with the dial and the five real pillar weights ·
for athletes · for coaches, scouts and clubs · Play · Safety · Pricing ·
the launch countdown and the store links · footer.

Two things it deliberately does **not** say: it claims no user numbers, and it
promises no ranking between athletes. The previous version of the site carried
"12,400+ Athletes · 850+ Clubs · 34K+ Verified Records" and "join over 1,200
athletes", none of which was true. What replaced them — free, 13+, no location
permission, seven languages — is both accurate and more persuasive.

---

## Relationship to the app repository

This is a standalone marketing site. `web/` in the AceAiX repository is a
separate React SPA that also holds the admin console and the legal pages served
from `mobile/lib/legal/`. Those legal pages are the canonical ones; if you link
to Privacy or Terms from here, point at wherever that app is deployed rather
than copying the text, so the two can never drift.

© 2026 AryAiX FZ-LLC. AceAiX is a trademark of AryAiX.
