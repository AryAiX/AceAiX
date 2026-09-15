# AceAiX early access — a site of its own

This folder is the early-access page, packaged to be the **whole** site rather
than a page inside one. Drag it onto Netlify and the page is at the root: no
`/early-access` in the address, nothing else deployed alongside it.

```
index.html          the page
assets/             logo, icons, the social preview image
_headers            caching
robots.txt          crawlers
sitemap.xml         one page
site.webmanifest    icons and colours for "add to home screen"
```

---

## Put it online

1. Go to <https://app.netlify.com/drop> and sign in (free).
2. Drag the **`aceaix-early-access` folder itself** onto the page — not the zip,
   and not the files from inside it.
3. A few seconds later you have an address like
   `brave-otter-1a2b3c.netlify.app`. That is the live page.

If you drag the files rather than the folder, you get a file listing instead of
a page. `index.html` has to end up at the top level, with `assets/` beside it.

---

## Where the sign-ups go

**Nowhere you have to set up.** The form posts to Netlify Forms, which is on by
default and needs no account beyond Netlify's own.

In the site dashboard: **Forms** → you will see one called `early-access`,
empty. Then **Forms → Settings and usage → Form notifications → Add
notification → Email notification**, and put in `masi.k@aryaix.com`. From then
on every sign-up lands in his inbox with the role, sport, country and age
answer in it. **Download as CSV** on the same screen gives you the whole list.

The free tier covers 100 submissions a month.

### Before you email anybody

Two things this route does not do, both worth knowing now rather than later:

**It does not prove the address is real.** Nobody clicks a confirmation link,
so a typo or a made-up address sits in the list looking exactly like a good one.

**It does not enforce the guardian rule.** The page asks whether the person is
under eighteen, and the submission arrives labelled `UNDER 18 — the address
above is a parent or guardian`. That label is a courtesy to whoever reads it,
not a check: nothing stops a fifteen-year-old entering their own address.

Both are handled by the Supabase route, which is the same page with one line
filled in — see the deployment runbook. Switching is reversible, and the list
Netlify collected in the meantime exports to CSV and merges in. But that route
has to be live before a launch email goes to a list containing parents of
children.

Because of all that, the page says *"You are on the list"* rather than *"Check
your inbox"*. It promises only what it can deliver.

---

## The two things to change

**1. Your address, once you have one.** Three lines near the top of
`index.html`, under a comment marked `THE OTHER THING TO SET`, currently say
`https://early.aceaix.com/`. They tell Google which URL is the real one and
tell WhatsApp and LinkedIn what to show when somebody shares the link. Change
all three the day the domain points here — or delete the `canonical` line if
you stay on the `.netlify.app` address. A canonical pointing at a domain that
does not resolve is worse than none at all.

`robots.txt` and `sitemap.xml` carry the same address and want the same edit.

**Do not point `aceaix.com` itself here.** It is already live, serving the
React console — the sign-in, the admin pages and the legal pages. Sending the
apex at Netlify would replace all of that. A subdomain such as
`early.aceaix.com` disturbs nothing.

**2. The launch date**, if it moves. One line near the bottom of `index.html`:

```js
var LAUNCH = Date.UTC(2026, 8, 30, 20, 0, 0);
```

Midnight on 1 October 2026 **in Dubai**, written in UTC so it means the same
instant everywhere. The month is zero-based, which is why September is `8`.
The countdown hides itself once the date passes; nobody has to edit anything on
launch morning.

---

## What this page does not include

The logo is not a link and there is no "About AceAiX" in the footer. On the
full site both go to the marketing home page, which is not deployed here — a
link to a page that does not exist is worse than no link. If you later deploy
the marketing site too, use the full `aceaix-website` package instead of this
one and both come back.

The App Store and Google Play buttons on the marketing site are not on this
page at all, which is deliberate: until 1 October those listings do not exist.

---

## Changing it later

Edit the file, then in Netlify go to **Deploys** and drag the folder onto the
drop area at the bottom of that page. It replaces the live version at the same
address.

Drop it on **Deploys**, not at `app.netlify.com/drop` — the second one creates
a brand-new site rather than updating yours, which is how people end up with
two sites and sign-ups arriving at the one nobody is watching.

---

© 2026 AryAiX FZ-LLC. AceAiX is a trademark of AryAiX.
Technical detail is in `docs/25-the-waitlist.md` in the app repository.
