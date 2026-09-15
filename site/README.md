# The AceAiX website

A static site. No build step, no framework, no `npm install` — the whole thing
is one HTML file plus a folder of images.

```
index.html          the site — one page, one form
assets/             screenshots, logo marks, icons, the social image
site.webmanifest    icons and colours for "add to home screen"
robots.txt          crawlers
sitemap.xml         one page
_headers            caching, for Netlify and Cloudflare Pages
vercel.json         caching, for Vercel
```

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

## The early-access form

It sits in the closing section, where the App Store and Google Play buttons
used to be. Those buttons led to listings that do not exist until 1 October, so
the page's main call to action pointed at two dead pages while the one thing
anybody could actually do sat underneath it looking like an afterthought.

The form asks for role, first name, sport, country, age band and email. Under
18s are welcome — this is a 13+ product — and they sign up with a **parent's**
address: choosing "I'm under 18" relabels the email field rather than adding a
second one, because two boxes invite a child to fill in both, and a child's own
address is the one thing this form must never hold.

**Nothing is deleted for launch day.** The store buttons are still in the HTML,
`hidden`; the countdown's `live()` reveals them, hides the form and relabels
every "Join early access" button to "Get the app" the moment the date passes.
Nobody edits anything on 1 October.

---

## Where the sign-ups go

The form can post to either of two places. **Nothing needs to be configured for
the simple one.**

**Netlify Forms, the default.** Drag the folder onto Netlify and sign-ups
start arriving with no further setup: they appear under **Forms** in the site
dashboard, as `early-access`, and Netlify emails each one to whoever you list
under *Form notifications* — put `masi.k@aryaix.com` there. Export the whole
list as CSV from the same screen. The free tier covers 100 submissions a
month.

Netlify reads the form markup **at deploy time**, not when somebody submits, so
the `name`, `data-netlify` and hidden `form-name` attributes must survive any
edit to the `<form>` tags. A form that loses them stops being captured
silently — the page still says thank you and nothing is stored.

**A Supabase edge function, when you want more.** Paste its URL into the marked
`<script>` block just after `<body>`:

```html
<script>window.ACEAIX_NOTIFY_URL = 'https://<project-ref>.supabase.co/functions/v1/waitlist-subscribe';</script>
```

Filling it in switches the page over. Nothing else changes, and it can be
emptied again. What it adds is the part a form cannot do on its own: a
confirmation email that proves the address is real, a database that **refuses**
a minor's row unless it carries a parent's address, and rate limiting. On the
Netlify route the form still asks whether the person is under 18 and labels the
submission `UNDER 18 — the address above is a parent or guardian`, but that
label is a courtesy to whoever reads it, not a check.

The confirmation wording follows the route: only the Supabase one tells
somebody to check their inbox, because only it sends anything. The Netlify one
says "you are on the list". Telling somebody to click a link that will never
arrive reads, to them, as a sign-up that failed.

There is no Supabase key on this page and there should never be one: the page
never talks to the database, the function does. `docs/25-the-waitlist.md`
explains why, and covers the guardian rule and the campaign-tool setup.

---

## Four things to change before launch

**1. The store badges are placeholders.** They are hidden until 1 October, but
they are what appears that morning, so this still has to be done. The App Store
and Google Play buttons currently use simple glyphs I drew. Apple and Google both publish official badge
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
listings do not go live before the app does — which is why the buttons are
hidden until the countdown reaches zero and the early-access form stands in
their place. Nothing to do here; it is noted so the 404s are not a surprise if
you unhide them to look.

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
Change it and everything dated follows: the countdown, the hero pill, the
closing section, and the swap described above.

When the date passes the page performs its own launch — countdown away, store
buttons in, early-access form out, every call-to-action relabelled. Nobody has
to edit anything on launch morning. `[hidden] { display: none !important; }`
near the top of the stylesheet is what makes that work: without it the `hidden`
attribute is outranked by any class that sets `display`, and the swap silently
does nothing.

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
