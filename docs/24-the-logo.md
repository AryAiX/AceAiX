# 24 — The logo

> The app shipped with somebody else's placeholder on the home screen, and a
> splash that launched to a white word on a white page.

---

## 1. What was actually wrong

The brand lockup had been dropped into `mobile/assets/images/` and wired into
some of the places that needed it, which is the state that looks finished and is
not. Five separate defects, none of which would have failed a build:

**The app icon was not the logo.** `icon.png` — the thing on the home screen,
and the thing Apple puts on the store listing — was a blue letter *A* in a
circle, a placeholder from before the brand existed. So was
`store-assets/app-store/icon-1024.png`, which is what would have been uploaded.

**The Play icon was the full lockup, wordmark and tagline included.** At the
48dp a launcher actually draws, the words are three pixels tall. Google's icon
guidance exists because of exactly this.

**The splash used one image for both schemes, and the wordmark in it is white.**
The light background is near-white. The app launched to what looked like a bare
triangle, and nothing about the config said why.

**The notification icon was a colour lockup.** Android keeps the alpha channel
of a notification icon and throws every colour away, then tints the stencil.
A detailed full-colour image becomes a white blob.

**The adaptive icon had no safe zone.** Launchers mask the 108dp canvas to
72dp. Art drawn to the edge loses its corners on every phone with round icons.

And two more that were only visible once the logo was right: the console drew a
lightning bolt in an azure square as its logo in four places, and the splash
background colours (`#F6F6F3` / `#0B0D11`) were not the app's background
colours (`#F7F6FD` / `#0B0A16`), so the handover flashed.

---

## 2. One source, one command

```bash
python3 tools/brand/build-brand-assets.py
```

`tools/brand/aceaix-logo.png` is the only logo file in the repository. Everything
else is cut from it:

| Output | Why it is not just a resize |
|---|---|
| `mobile/assets/images/icon.png` | **No alpha channel** — Apple rejects the upload, not the build |
| `store-assets/app-store/icon-1024.png` | byte-identical to the above, on purpose |
| `store-assets/play/icon-512.png` | mark only, on the ground; never the lockup |
| `mobile/assets/images/adaptive-icon.png` | mark at 44% of the canvas, inside the mask's safe zone |
| `mobile/assets/images/splash-icon.png` | lockup with the type recoloured to ink, for the light scheme |
| `mobile/assets/images/splash-icon-dark.png` | lockup as supplied, white type, for the dark scheme |
| `mobile/assets/images/notification-icon.png` | a white silhouette from the alpha channel, 96px |
| `mobile/assets/images/logo-mark.png` | the mark alone, for the header and the welcome screen |
| `web/public/aceaix-mark.png` | the same mark, for the console |
| `web/public/aceaix-favicon.png` | rounded, for the browser tab |

The tagline is dropped from every derived asset. At the size a splash or an
icon draws it, it is a smudge.

Two details in that script are worth knowing before changing it. The band
boundaries between mark, wordmark and tagline are **measured from the alpha
channel on every run** rather than hardcoded, so re-cropping the source does not
silently shift every icon. And the light splash is made by recolouring only
pixels that are bright *and* unsaturated — which leaves the mark and the orange
`X` alone, because both are saturated.

---

## 3. The launch, as a sequence

It used to be four screens: the native splash with the logo, then a bare
coloured page while the language loaded, then a spinner while the session
loaded, then the app. Two of those four were empty.

Both empty ones are now `components/common/BrandSplash.tsx` — the same lockup,
at the same 240pt width, on the same background as the native splash, so the
handover is invisible and the app appears to hold on its own mark rather than
blink through two nothing-states.

**If you change `imageWidth` in `app.json`, change the width in `BrandSplash`
too**, or the logo jumps a few points at the seam.

The mark then stays on screen: the language gate carries it, the welcome screen
carries it, and the home header is a real lockup — mark beside name — rather
than the app setting its own name in type. The supplied lockup stacks the mark
*above* the word, which is square and wrong for a header, so `Wordmark.tsx`
composes the two sideways instead of scaling an image nobody could read.

---

## 4. What is checked, and where

`mobile/tests/unit/brandAssets.test.ts`, in the normal unit run. Eleven
assertions, each standing in for a failure that otherwise surfaces somewhere
expensive:

- every path `app.json` names exists — otherwise the EAS build fails minutes in,
  naming a temporary directory
- the app icon has **no alpha channel** — otherwise the *upload* fails, after a
  successful build, with "Invalid large app icon" and no file name
- the App Store icon is byte-identical to the app icon — otherwise the listing
  and the home screen drift apart and nothing warns anybody
- the two splash images are different files, both exist, and their background
  colours are the app's own
- the notification icon is small and transparent — a large file is the tell that
  somebody has pasted the colour lockup back in

The adaptive icon's safe zone is enforced by the generator rather than the test:
the test can see that the file is square and transparent, but "the mark is 44%
of the canvas" is a property of how it was made.

---

## 5. One thing this exposed beyond the icons

The welcome screen's three decorative flares are positioned deliberately
off-canvas (`right: -120` on a 360pt box) so they read as light spilling in from
outside the screen. On a phone that costs nothing. On web the page is a real
document, so an unclipped child made the document 120px wider than the
viewport — the whole screen could be dragged sideways, with a strip of bare page
down the right.

This is the *same defect* as the create button in
[docs/22](22-endorsements-and-edges.md), from the same cause, and
`tests/e2e/look.mjs` exists to catch it. It caught the button and missed this,
because **`look.mjs` walks the recorded preview, which is signed in, and the
welcome screen is signed out.** The screen is clipped now. The gap in the walk
is not closed: no e2e suite currently reaches any signed-out screen.

---

## 6. Still outstanding

- **The store badge artwork on the marketing site is still hand-drawn.** Apple
  and Google both publish official badges with rules about size and clear
  space; a redrawn version of someone else's trademark is against both.
- **`feature-graphic-1024x500.png`** was made before this and still uses the old
  crop of the lockup. It is legible, so it is not urgent, but it is not from the
  generator.
- **No e2e coverage of any signed-out screen**, per §5.

---

## 7. Related documents

- [20 — Colour and motion](20-colour-and-motion.md) — the tokens the icon ground and splash colours come from
- [22 — Endorsements and the edges](22-endorsements-and-edges.md) — the first instance of the overflow defect in §5
- [15 — Known gaps](15-known-gaps.md) — the store decisions still open
