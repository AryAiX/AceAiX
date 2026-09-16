# 20 — Colour and motion

> Why the app is not grey any more, and the four rules that keep it that way.
>
> This is the mobile app's visual system as it stands in code. [04 — Design System](04-design-system.md)
> describes **Floodlight**, the Bolt web prototype's system; the two are relatives, not the same
> thing, and where they disagree this document is the one that matches `mobile/theme/tokens.ts`.

---

## 1. What was wrong

The app was not painted grey. It came out grey, which is worse, because every individual decision
looked reasonable.

**The tier ramp was a metal ramp.** `rising` was `#8A8F99` and `silver` was `#9AA5B1` — two greys.
That map is not just a label colour: the Talent Score ring, every avatar ring and the profile cover
were all painted from it. So the lower your score, the greyer the app looked, which is exactly
backwards for a fourteen-year-old on their first day. Two of the five tiers, and the two that almost
everybody starts in, rendered the app's hero object as a grey circle on a grey band.

**Colour was applied at 20% and called an accent.** The two tiles at the top of Home were ordinary
cards under a `rgba(colour, 0.2)` wash. On the light scheme that is a white card with a hint of
something in one corner. The same pattern was on the profile cover (26%), the challenge banner and
the empty states.

**Flat fills on large surfaces.** A single colour across a wide band gives the eye nothing to travel
along; it reads as unpainted rather than as painted-one-colour.

**Nothing moved.** There was real motion in the app — the score ring charged, cards sprang on press,
the streak chip celebrated — but it was concentrated in a handful of components and absent from
every list, screen entrance and hero surface.

---

## 2. The palette now

### The play hues

```
flame #FF5A1F   magenta #F0308C   violet #8B5CF6   azure #2E7DF6
cyan  #12C2E9   mint    #10D5A0   lime   #C9F03C   amber #FFB020
```

Eight saturated colours that exist to be used, on cards, chips, tiles and gradients. They are
deliberately **not semantic** — none of them means "warning". You pick one with `hueFor(seed)` or a
pair with `huePair(seed)`, and because the pick is a hash of the seed, a given club, team or person
keeps its colour on every screen and in every session. That is what turns colour into a label rather
than decoration.

`huePair` steps **three** places along the hue ring rather than hashing a mutated seed. Hashing
`seed + '~'` collides with `seed` about one time in eight, and a "gradient" whose two stops are the
same colour is a flat square — which is exactly what the first version of the monogram viewer shipped
as.

### The tier ramp

| Tier | Score | Start | End |
|------|-------|-------|-----|
| rising | 0–39 | `#12C2E9` cyan | `#5B9BFF` |
| bronze | 40–54 | `#10D5A0` mint | `#12C2E9` |
| silver | 55–69 | `#8B5CF6` violet | `#F0308C` |
| gold | 70–84 | `#FFB020` amber | `#FF7A45` |
| elite | 85–100 | `#FF3D7F` | `#FF9E1F` |

Two stops per tier, so a tier is a sweep and not a swatch, and the ramp still reads as a ramp — cool
and electric at the bottom, hot and metallic at the top. Nothing in it is grey.

### The gradient set

Six named gradients per scheme, on `theme.gradients`:

| Name | For |
|------|-----|
| `action` | Primary buttons, the create button, the wordmark, section rules |
| `score` | The Talent Score, and nothing else |
| `hero` | Big headers, covers, the welcome screen |
| `cool` | Discovery, teams, "who looked at your profile" |
| `warm` | Streaks, challenges, anything with a clock on it |
| `party` | Celebrations only |

Three stops each, always. `expo-linear-gradient` interpolates in sRGB and two distant hues go through
mud in the middle; the middle stop is the bridge.

### Surfaces

Light was `#F6F6F3`, a warm grey the colour of newsprint. Both schemes now carry a trace of indigo —
`#F7F6FD` and `#0B0A16` — which reads as *light* and *deep* rather than as *unpainted*, and gives the
saturated cards something to sit on instead of looking like stickers on a slab.

---

## 3. The motion kit

`components/ui/Motion.tsx`. Four things, used everywhere, so that "the app moves" is a property of
the design system and not of whichever screen someone remembered to animate.

| Component | What it does |
|-----------|--------------|
| `Reveal` | Content arrives: a short sprung rise with a fade. `index` staggers a list by 55ms per row, capped at six so the twelfth card is not a second and a half late |
| `AnimatedGradient` | A gradient that drifts. Two copies of the sweep, one reversed, cross-faded for ever — one opacity value on the native driver, no per-frame JS |
| `Shine` | A highlight that crosses a surface every few seconds. Goes *inside* the thing it lights, which needs `overflow: 'hidden'` |
| `Pulse` | A soft halo behind a small live element |

`react-native-reanimated` is stubbed out in this project, so all of it is RN's own `Animated`,
native-driven wherever the property allows.

**Every one of them collapses under reduce-motion** — and collapses to the *finished state*, not to
nothing. A motion-reduced build still tells you what changed; it just tells you instantly.

The Talent Score ring carries one continuous animation of its own: a highlight that walks the filled
arc every four seconds. It is one interpolated value on the JS thread, on the screen people come back
to look at, and it is the difference between a dial and a screenshot of a dial.

---

## 4. Four rules

1. **Never reference a raw hex in a screen.** `useTheme()` gives you `colors`, `gradients`, `play`,
   `hueFor` and `huePair`. The exception, and it is a real one: type and icons *on* a saturated tile
   are `#FFFFFF` literals, because every palette token is tuned for a surface and all of them read as
   smudges on a gradient.
2. **A large surface gets a gradient, not a fill.** Buttons, covers, tiles, empty-state bubbles.
3. **A fallback is still a thing to look at.** No photo, no crest and no cover are the *common* cases
   in a young network, not the edge cases. Each of them gets the person's or club's own colour rather
   than a grey disc.
4. **Anything that loops consults `useReducedMotion()`.**

---

## 5. Two web-specific traps, both of which shipped once

Both come from `expo export --platform web`, which is how the [preview build](18-preview-build.md) is
made — so they are invisible on a phone and obvious in the artifact.

**Paint order is not source order.** In React Native, siblings paint in source order. On the web,
CSS wins: a positioned element paints above static content whatever the order. So this

```jsx
<Pressable>
  <LinearGradient style={StyleSheet.absoluteFill} />
  <Plus />            {/* lucide renders a bare <svg>: static */}
</Pressable>
```

renders a plus icon on a phone and a plain coloured circle on the web. It shipped that way, and the
create button in the tab bar had no plus in it. The fix is to wrap the content in a `View`, which
gives it a stacking context of its own. Anything drawn under an `absoluteFill` overlay needs this.

**SVG ids are global to the document.** `ScoreRing` defined its gradient as `id="scoreGradient"` — safe
while only one ring is ever on screen, and it never was: the router keeps the screen you came from
mounted, so opening the score screen from the profile put two `<svg>` elements carrying that id in one
document. The browser resolved `url(#scoreGradient)` to the first, a gradient defined inside the other
svg in a different coordinate space, and painted nothing at all. The arc simply vanished on the one
screen the whole app is built around. Ids inside a reusable component come from `useId()`, with the
colons stripped because they are not legal in a URL fragment.

---

## 6. Related documents

- [04 — Design System](04-design-system.md) — Floodlight, the web prototype's system
- [10 — Mobile App](10-mobile-app.md) — the screens this is applied to
- [18 — The preview build](18-preview-build.md) — where both web traps were caught
