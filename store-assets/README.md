# Store assets

Everything both stores ask for as a file, generated rather than photographed —
so it can be regenerated the day a screen changes, in any language, without a
simulator or a device.

```bash
cd mobile
npm run preview                                    # export → record → bake
node tests/e2e/store-screenshots.mjs --langs en,ar # the screenshots
```

The icons and the feature graphic are produced from `mobile/assets/images/` by
the snippet recorded in the commit that added this folder; they change only when
the logo does.

## What is here

| Path | Size | Notes |
|------|------|-------|
| `app-store/icon-1024.png` | 1024 × 1024 | **No alpha.** Apple rejects a transparent app icon. |
| `play/icon-512.png` | 512 × 512 | 32-bit with alpha, as Play asks. |
| `play/feature-graphic-1024x500.png` | 1024 × 500 | Required on every Play listing. |
| `screenshots/app-store/iphone-6.7/{en,ar}/` | 1290 × 2796 | 6 each. |
| `screenshots/app-store/iphone-6.5/{en,ar}/` | 1242 × 2688 | 6 each. |
| `screenshots/play/phone/{en,ar}/` | 1080 × 1920 | 6 each. |

The six shots are the feed, the athlete profile with the Talent Score, the score
breakdown, discovery, trials, and notifications — chosen because they show the
machinery a reviewer looks for rather than the prettiest screens.

## Two rules

**Every account shown is an adult.** No minor's face belongs in a store listing,
and the seeded demo data is arranged so the screenshot tour never opens one.

**English and Arabic, at minimum.** Screenshots are per-localisation in both
stores, and Arabic is the only right-to-left layout — it is the fastest way to
show a reviewer the localisation is real rather than a language picker over
English text. Add more with `--langs en,ar,fr,es,de,ru,zh`.

## When Apple adds a slot

Apple has been adding display sizes (a 6.9" slot at 1320 × 2868 is the current
one to watch). Add it to `SLOTS` in `mobile/tests/e2e/store-screenshots.mjs` and
re-run — that is the whole change. App Store Connect at upload time is the
authority on which slots are mandatory, not this file.
