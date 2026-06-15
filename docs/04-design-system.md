# 04 — Design System ("Floodlight")

The Bolt prototype ships a mature, production-worthy visual system called **Floodlight** —
"Stadium Energy", dark-by-default, cinematic. We **keep this design system** and carry it into the
platform. This document captures it as the canonical reference so screens stay consistent.

Source of truth in code: `tailwind.config.js`, `src/index.css`. This doc mirrors them; if they drift,
the code wins — update this doc.

---

## 1. Design language

- **Dark-first / cinematic.** Default canvas is stadium-dark `#0C1A2B`. Light mode is a future option
  (theme toggle exists in the prototype but most surfaces are dark-only today — treat dark as the spec).
- **Glassmorphism.** Frosted panels (`backdrop-filter: blur`) over a subtle animated aurora background.
- **Energy accents.** Azure (brand) + Volt (electric lime) used sparingly for "live", AI, and top-tier signals.
- **Data-dense but breathable.** Rounded cards (16–32px radius), tabular numerals for stats, soft glows.
- **Motion.** Spring/expo easing, slide-up reveals, score-ring charge animations, aurora drift,
  marquee tickers. Respect `prefers-reduced-motion`.

---

## 2. Color tokens

### Surfaces
| Token | Value | Use |
|-------|-------|-----|
| `page` / `--bg` | `#0C1A2B` | App canvas |
| `panel` / `--surface` | `#16273B` | Cards, panels |
| `--surface-hover` | `#1E3349` | Hover state |
| `--input-bg` | `#0F2133` | Inputs |
| `navy.900/800/700/600/500` | `#060E1E`→`#1C3366` | Cinematic gradients |
| `rim` / `--border` | `rgba(255,255,255,0.12)` | Hairline borders |

### Text
| Token | Value | Use |
|-------|-------|-----|
| `ink` / `cloud` / `--text` | `#F4F8FC` | Primary text |
| `--text-secondary` | `#9DB0C6` | Secondary |
| `muted` / `slate` / `--text-muted` | `#7C8DA6` | De-emphasized |

### Brand & semantic
| Token | Value | Meaning |
|-------|-------|---------|
| `azure` | `#2F80ED` (50–700 scale) | Primary brand, links, primary actions, AI |
| `volt` | `#B8F135` | "Live", top-tier, AI match, electric accents (dark navy text on volt) |
| `emerald` | `#1FB57A` | Success, verified, cleared |
| `amber` | `#F5A623` | Warning, pending, "hot" |
| `coral` | `#EF5350` | Error, danger, sign-out, live-dot |

> **Status color mapping** (use consistently): cleared/verified → emerald; pending/restricted → amber;
> not-cleared/error → coral; informational/brand → azure; elite/live/AI-top → volt.

---

## 3. Typography

| Family | Stack | Use |
|--------|-------|-----|
| Display | `Clash Display` → Inter fallback | Headings (`h1`–`h6`), big numbers (`.font-display`) |
| Sans | `Inter` | Body, UI |
| Arabic | `IBM Plex Sans Arabic` | Arabic / RTL (P2) |
| Mono | `IBM Plex Mono` | Code / technical |

- Headings: weight 600, `line-height 1.1`, `letter-spacing -0.02em`.
- Numerics: `.tabular` (`font-variant-numeric: tabular-nums`) for all stats/scores.
- Fonts loaded via Fontshare (Clash) + Google Fonts (Inter, IBM Plex) in `index.css`. For production,
  consider self-hosting fonts for performance (LCP target < 2s) and offline PWA.

---

## 4. Component classes (in `index.css` `@layer components`)

Reuse these utility classes rather than re-inventing styles:

- **Cards:** `.card` (glass, default), `.card-hover`, `.card-dark`, `.card-dark-hover`, `.card-glass`.
- **Nav/glass:** `.glass-nav`, `.glass-dark`, `.nav-item`, `.nav-item-active`.
- **Buttons:** `.btn-primary` (azure), `.btn-volt`, `.btn-outline`, `.btn-ghost`, `.btn-outline-dark`.
- **Inputs:** `.input-field` (+ `.input-search`).
- **Status chips:** `.chip-cleared`, `.chip-pending`, `.chip-restricted`, `.chip-not-cleared`.
- **Badges:** `.badge-azure`, `.badge-emerald`, `.badge-volt`, `.badge-amber`, `.badge-coral`, `.badge-muted`.
- **Effects:** `.text-gradient-azure`, `.text-gradient-volt`, `.energy-line`, `.volt-underline`,
  `.live-dot`, `.live-dot-volt`, `.shimmer` (skeletons), `.reveal`/`.reveal.visible`, `.animate-in`.
- **Utility:** `.scrollbar-hidden`, `.tabular`, `.snap-container`/`.snap-item`, `.ticker-track`.

> Several legacy aliases exist (`.card-light`, `.input-dark`, `.badge-blue`, etc.) that just map to the
> dark equivalents — a cleanup artifact from the prototype's light→dark migration. During cleanup,
> collapse aliases to the canonical class names (see [07](./07-prototype-audit.md)).

---

## 5. Reusable UI components (`src/components/ui/`)

Keep and standardize these from the prototype:

| Component | Purpose |
|-----------|---------|
| `ScoreRing` | Animated circular score gauge (visibility / AI score / completeness) |
| `StatTile` | KPI tile with trend indicator |
| `StatusChip` | Clearance/verification status pill |
| `VerifiedBadge` | Verified-partner / verified-athlete badge |
| `AthleteCard` | Athlete summary card (grid) |
| `RecommendationCard` | Endorsement/recommendation display |
| `GlassPanel` | Frosted container primitive |
| `MagneticButton` | Cursor-following CTA |
| `AuroraBackground` | Animated gradient backdrop |
| `StoryRing`, `ReactionBurst` | Social/feed flourishes |

Profile sections live in `src/components/profile/` (About, Attributes, Highlights, Medical,
Performance, Honors, Recommendations, etc.) — these compose the public athlete profile.

---

## 6. Tokens reference: radii, shadows, motion

- **Radii:** `2xl=16px`, `3xl=24px`, `4xl=32px` (cards use 16; heroes use 24–32).
- **Shadows:** brand glows `azure-glow`, `volt-glow`, `emerald-glow`; glass `glass`; dark `dark-card`,
  `dark-hover`.
- **Easing:** `spring` `cubic-bezier(0.34,1.56,0.64,1)`, `expo` `cubic-bezier(0.19,1,0.22,1)`.
- **Animations:** `fade-in`, `slide-up`, `slide-in-right`, `marquee`, `story-ring`, `stamp-in`,
  `charge-ring`, `float`, `shimmer`, `aurora1/2`.

---

## 7. Accessibility & i18n requirements (apply to every screen)

- Keyboard navigable with visible focus rings (don't suppress `:focus-visible`).
- Contrast ≥ 4.5:1 normal text, 3:1 large. Audit muted-on-dark combos (`#7C8DA6` on `#0C1A2B` is ~4.3:1 —
  acceptable for large/secondary only; don't use for small critical text).
- Associate labels with inputs; announce errors via `aria-live`.
- Touch targets ≥ 44×44px; honor `prefers-reduced-motion` (gate aurora/marquee/float).
- Provide `alt` text for athlete imagery; mark decorative gradients `aria-hidden`.
- **RTL (P2):** use Tailwind logical properties (`ms-`, `me-`, `ps-`, `pe-`) instead of `ml-`/`mr-`;
  set `dir="rtl"` on `<html>` for Arabic; mirror directional icons. Begin enforcing logical properties
  now so the P2 RTL switch is low-cost.

---

## 8. Design principles for new screens

1. Start from existing `.card` + `ui/` primitives; don't introduce new color values — use tokens.
2. Reserve **volt** for AI/live/top-tier moments; overuse kills its impact.
3. Every stat uses `.tabular`; every status uses the canonical color mapping (§2).
4. Loading = `.shimmer` skeletons matching final layout (not spinners) for content areas.
5. Empty states get an icon tile + one-line explanation + a primary action (see SearchPage pattern).
6. Keep motion subtle and purposeful; gate behind reduced-motion.
