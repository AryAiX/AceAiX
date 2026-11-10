/**
 * AceAiX design tokens — "Cobalt & Ember"
 *
 * Built for an audience of 10–25 year old athletes, with parents and coaches
 * looking over their shoulder. Energetic without being childish; calm enough
 * that an adult trusts it with a minor's profile.
 *
 * Every colour is defined for BOTH schemes. Never reference a raw hex in a
 * screen — always go through `useTheme()`.
 *
 * ── What changed in this revision, and why ───────────────────────────────────
 * The app was orange-led, which put it in the same visual family as every
 * other social feed. It is now cobalt-led, with violet carrying the secondary
 * work, and the warm end of the brand reserved for ONE meaning: time.
 *
 *   cobalt  #2F6BFF   primary actions, active states, links
 *   violet  #7A6CFF   the Talent Score, secondary surfaces, tab-bar fade
 *   sky     #8ACDFF   the light end of every cool sweep
 *   ember   #E8372B   time only — deadlines, closing soon, live streaks
 *
 * `gradients.warm` is the amber → orange → ember ombre. Its original comment
 * already read "streaks, challenges, anything with a clock on it", so every
 * surface that was warm stays warm and simply inherits the new ramp. Nothing
 * else in the app is permitted to be warm, which is what makes warm mean
 * "act now" rather than "decoration".
 *
 * The tier ramp follows the same logic in the other direction: it runs cool at
 * the bottom and warm at the top, so the warm colours are *earned*. A Rising
 * athlete's ring is sky; an Elite athlete's ring is the ember ombre.
 *
 * EVERY EXPORT NAME, TYPE AND FUNCTION SIGNATURE IN THIS FILE IS UNCHANGED
 * from the previous revision. Only values changed. That means this file is a
 * drop-in replacement: no call site anywhere in `mobile/` needs editing for
 * the colour, radius and depth change to take effect.
 *
 * The one additive change is `FontFamily.mono` / `monoBold`, which require the
 * matching family to be registered in `app/_layout.tsx`'s `useFonts` call.
 * Until it is registered those two keys are simply unused — nothing breaks.
 */

export type ColorScheme = 'light' | 'dark';

// ── Brand constants (identical across schemes) ────────────────────────────────
export const Brand = {
  /** Ace Orange — the logo mark only. No longer a UI colour. */
  orange: '#FF7A2C',
  orangeBright: '#FFB347',
  /** Ember — time, and nothing but time. Deadlines, closing, live streaks. */
  ember: '#E8372B',
  /** Volt — kept for the logo's accent. Scarcity = meaning. */
  volt: '#C9F03C',
  /** Cobalt — the new primary. Actions, active states, links. */
  cobalt: '#2F6BFF',
  cobaltDeep: '#1B3DFF',
  /** Violet — the Talent Score and the tab-bar fade. */
  violet: '#7A6CFF',
  /** Sky — the light end of every cool sweep. */
  sky: '#8ACDFF',
  /** Sun — "new" counts, Highlight labels, streak badges and the ± steppers.
   *  Bright fill, pastel fill, and the ink to write on them. */
  sun: '#FFD84D',
  sunPastel: '#FFF6C7',
  sunInk: '#8A6400',
  /** Azure — verification, trust, links. Now the same family as cobalt. */
  azure: '#2F6BFF',
  azureBright: '#5C90FF',
  ink: '#14161A',
  paper: '#FFFFFF',
} as const;

/**
 * The play colours.
 *
 * Eight saturated hues that exist to be *used* — on cards, chips, tiles and
 * gradients — so a screen full of information is not a screen full of grey.
 * They are deliberately not semantic: nothing means "this is a warning". Pick
 * one with `hueFor(seed)` and a given team, sport or challenge keeps its colour
 * everywhere it appears.
 *
 * Cooled relative to the previous revision so the set sits inside the cobalt
 * identity, while keeping eight values that are still clearly distinguishable
 * from one another — that distinguishability is the whole point of `hueFor`.
 */
export const Play = {
  flame: '#FF7A2C',
  magenta: '#DE208D',
  violet: '#7A6CFF',
  azure: '#2F6BFF',
  cyan: '#26A9F5',
  mint: '#19C79A',
  lime: '#B9E63C',
  amber: '#FFB347',
} as const;

export type PlayHue = keyof typeof Play;

/**
 * Points you can gain, coloured by how many. The same cut-offs on every
 * screen, so a "+7" is always the same chip wherever it appears: 1–6 yellow,
 * 7–11 orange, 12 and up green. Each is a soft ombre with its own dark ink.
 * (The tips `build_score_tips` writes are worth 2 per missing field, 5/10/15
 * for clips, 6 for an endorsement, 7 for verification and 12 for matches.)
 */
export type PointsBand = 'small' | 'mid' | 'big';

export const PointsRamp: Record<PointsBand, readonly [string, string]> = {
  small: ['#FFE766', '#FFC727'],
  mid: ['#FFB54D', '#FF8A2B'],
  big: ['#5CE6A6', '#1EC98A'],
};

export const PointsInk: Record<PointsBand, string> = {
  small: '#4A3300',
  mid: '#4A1D00',
  big: '#063D2A',
};

export function pointsBand(points: number): PointsBand {
  if (points >= 12) return 'big';
  if (points >= 7) return 'mid';
  return 'small';
}

const HUE_ORDER: PlayHue[] = [
  'azure',
  'violet',
  'cyan',
  'mint',
  'magenta',
  'amber',
  'lime',
  'flame',
];

function hueIndex(seed: string | null | undefined): number {
  if (!seed) return 0; // azure
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % HUE_ORDER.length;
}

/**
 * A stable colour for an arbitrary string. The same team, sport or challenge
 * gets the same hue on every screen and in every session, which is what makes
 * colour feel like a label rather than decoration.
 */
export function hueFor(seed: string | null | undefined): string {
  return Play[HUE_ORDER[hueIndex(seed)]];
}

/**
 * The same, as two stops for a gradient.
 *
 * The obvious way to get a second colour — hash the seed with a character
 * appended — collides often enough to matter: on eight hues, roughly one name
 * in eight lands on its own colour twice and the "gradient" comes out a flat
 * square. Stepping three places along the ring instead is collision-free by
 * construction, and three steps is far enough that the two are always visibly
 * different.
 */
export function huePair(seed: string | null | undefined): [string, string] {
  const i = hueIndex(seed);
  return [Play[HUE_ORDER[i]], Play[HUE_ORDER[(i + 3) % HUE_ORDER.length]]];
}

// ── Talent tier ramp ──────────────────────────────────────────────────────────
/**
 * Cool at the bottom, warm at the top — so warmth is earned.
 *
 * The profile cover, the score ring and every avatar ring are painted from this
 * map, so it decides what most of the app looks like for most people. Running
 * it sky → cobalt → violet → amber → ember means a new fourteen-year-old gets
 * an electric sky ring rather than a dull one, and the ember ombre only ever
 * appears on someone who has actually reached the top band. That is the same
 * argument as reserving warm for deadlines: the colour carries information.
 */
export const TierColors = {
  rising: '#8ACDFF',   // 0–39   sky
  bronze: '#2F6BFF',   // 40–54  cobalt
  silver: '#7A6CFF',   // 55–69  violet
  gold: '#FFB347',     // 70–84  amber
  elite: '#E8372B',    // 85–100 ember
} as const;

/** Second stop for the tier gradients, so a tier is a sweep and not a swatch. */
export const TierColorsEnd = {
  rising: '#2F6BFF',
  bronze: '#7A6CFF',
  silver: '#8ACDFF',
  gold: '#FF7A2C',
  elite: '#FFB347',
} as const;

export type Tier = keyof typeof TierColors;

/** The two stops a tier is drawn with. */
export function tierGradient(tier: Tier): [string, string] {
  return [TierColors[tier], TierColorsEnd[tier]];
}

export function tierForScore(score: number): Tier {
  if (score >= 85) return 'elite';
  if (score >= 70) return 'gold';
  if (score >= 55) return 'silver';
  if (score >= 40) return 'bronze';
  return 'rising';
}

export const TierLabels: Record<Tier, string> = {
  rising: 'Rising',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  elite: 'Elite',
};

// ── Gradients ─────────────────────────────────────────────────────────────────
/**
 * Flat colour is what made the app read as grey even where it was not grey: a
 * single fill on a large surface has nothing for the eye to travel along. Every
 * hero surface — the create button, the score, section headers, the profile
 * cover, empty states — is painted from one of these instead.
 *
 * Three stops, always, because `expo-linear-gradient` interpolates in sRGB and
 * two distant hues go through mud in the middle. The middle stop is the bridge.
 *
 * Draw the cool sweeps on a diagonal with the LIGHT stop at the top-right:
 * `start={{ x: 1, y: 0 }} end={{ x: 0.12, y: 1 }}`. That puts the highlight
 * where a light source would be and keeps the deep cobalt in the lower-left,
 * which is what stops a small square button reading as a flat blue chip.
 */
export interface GradientSet {
  /** Primary actions. Sky → cobalt → deep cobalt. */
  action: readonly [string, string, string];
  /** The Talent Score, and nothing else. */
  score: readonly [string, string, string];
  /** Big headers and covers. */
  hero: readonly [string, string, string];
  /** Discovery, teams, anything that should feel like open air. */
  cool: readonly [string, string, string];
  /** Streaks, challenges, anything with a clock on it. THE ONLY WARM SURFACE. */
  warm: readonly [string, string, string];
  /** Celebrations only. */
  party: readonly [string, string, string];
}

const gradientsLight: GradientSet = {
  action: ['#8ACDFF', '#2F6BFF', '#7A6CFF'],
  score: ['#8ACDFF', '#2F6BFF', '#7A6CFF'],
  hero: ['#5CB4FF', '#2F6BFF', '#8273FF'],
  cool: ['#26A9F5', '#2F6BFF', '#7A6CFF'],
  warm: ['#FFB347', '#FF7A2C', '#E8372B'],
  party: ['#FFB347', '#E8372B', '#7A6CFF'],
};

const gradientsDark: GradientSet = {
  action: ['#9ED6FF', '#5C90FF', '#9387FF'],
  score: ['#9ED6FF', '#5C90FF', '#9387FF'],
  hero: ['#5CB4FF', '#2F6BFF', '#8273FF'],
  cool: ['#49BAFF', '#5C90FF', '#9387FF'],
  warm: ['#FFC264', '#FF8A42', '#F2493C'],
  party: ['#FFC264', '#F2493C', '#9387FF'],
};

// ── Palettes ──────────────────────────────────────────────────────────────────
export interface Palette {
  scheme: ColorScheme;

  // Surfaces
  bg: string;
  surface: string;
  surfaceAlt: string;
  surfaceSunken: string;
  surfaceInverse: string;
  overlay: string;
  scrim: string;

  // Lines
  border: string;
  borderStrong: string;
  divider: string;

  /* Controls that sit on top of a card or the page: search boxes, inputs,
     filter chips. In dark mode they are a step lighter than the cards, with a
     faint lit top edge, so they read as raised. In light mode they are white. */
  field: string;
  fieldBorder: string;
  /** The lit top edge on raised things in dark mode; transparent in light. */
  edgeLight: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  textOnBrand: string;

  // Brand
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  primaryBorder: string;

  accent: string;        // The Talent Score — violet
  accentSoft: string;
  onAccent: string;

  /** Yellow. `sun` is the bright fill, `sunSoft` the pastel/tinted fill,
   *  `onSun` the ink for text or icons sitting ON the bright fill. */
  sun: string;
  sunSoft: string;
  onSun: string;

  info: string;
  infoSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;

  // Utility
  skeleton: string;
  shadow: string;
  tabBar: string;
  statusBar: 'light' | 'dark';

  gradients: GradientSet;
  /** The play hues, so a screen can reach them through the theme. */
  play: typeof Play;
}

const light: Palette = {
  scheme: 'light',

  /* Unchanged from the previous revision — these violet-tinted neutrals read as
     light rather than as "unpainted", and they happen to sit under cobalt and
     violet better than a true grey would. */
  bg: '#F7F6FD',
  surface: '#FFFFFF',
  surfaceAlt: '#F1EFFB',
  surfaceSunken: '#E9E6F7',
  surfaceInverse: '#161327',
  overlay: 'rgba(22,19,39,0.55)',
  scrim: 'rgba(22,19,39,0.08)',

  border: '#E3E2F0',
  borderStrong: '#C9CBDE',
  divider: '#EEEBF8',

  field: '#FFFFFF',
  fieldBorder: '#E3E2F0',
  edgeLight: 'transparent',

  text: '#161327',
  textSecondary: '#514C6B',
  textMuted: '#847EA0',
  textInverse: '#FFFFFF',
  textOnBrand: '#FFFFFF',

  primary: '#2F6BFF',
  primaryPressed: '#2355E0',
  primarySoft: '#E8F0FF',
  primaryBorder: '#BDD4FF',

  accent: '#7A6CFF',
  accentSoft: '#EDEBFC',
  onAccent: '#FFFFFF',

  sun: '#FFD84D',
  sunSoft: '#FFF6C7',
  onSun: '#8A6400',

  info: '#2F6BFF',
  infoSoft: '#E8F0FF',
  success: '#0E9F63',
  successSoft: '#E1F7EC',
  /* Warning stays amber and danger stays red, but both are pulled away from the
     ember ombre so a validation error never reads as a countdown. */
  warning: '#D9820B',
  warningSoft: '#FDF1DC',
  danger: '#D92D3F',
  dangerSoft: '#FCE9EB',

  skeleton: '#E9E6F7',
  shadow: '#2A2350',
  tabBar: '#FFFFFF',
  statusBar: 'dark',

  gradients: gradientsLight,
  play: Play,
};

const dark: Palette = {
  scheme: 'dark',

  /* Lifted off near-black onto a blue-grey slate. Two reasons: at #0B0A16 the
     app read as a void, and — less obviously — cobalt goes muddy against true
     black because there is no local contrast left to carry the hue. Separation
     between card and background now comes from the surface being lighter than
     the background rather than from a border, which is why there are no light
     outlines in dark mode any more. */
  /* Lifted a step (9 Nov): the old #181B24 page read as near-black and made
     grey text hard to read. Each layer is still lighter than the one below. */
  bg: '#1F232E',
  surface: '#2A2F3C',
  surfaceAlt: '#353B4A',
  surfaceSunken: '#181B24',
  surfaceInverse: '#FFFFFF',
  overlay: 'rgba(8,9,14,0.72)',
  scrim: 'rgba(255,255,255,0.07)',

  border: '#3E4558',
  borderStrong: '#4E5669',
  divider: '#353B4A',

  field: '#3B4254',
  fieldBorder: '#4E5669',
  edgeLight: '#4A5266',

  text: '#F4F5FA',
  textSecondary: '#C3C7D4',
  textMuted: '#A3A8B8',
  textInverse: '#161327',
  textOnBrand: '#FFFFFF',

  primary: '#5C90FF',
  primaryPressed: '#7AA6FF',
  primarySoft: 'rgba(92,144,255,0.18)',
  primaryBorder: 'rgba(92,144,255,0.38)',

  accent: '#9387FF',
  accentSoft: 'rgba(147,135,255,0.18)',
  onAccent: '#FFFFFF',

  sun: '#FFD84D',
  sunSoft: 'rgba(255,216,77,0.18)',
  onSun: '#8A6400',

  info: '#6BA6FF',
  infoSoft: 'rgba(107,166,255,0.18)',
  success: '#32D583',
  successSoft: 'rgba(50,213,131,0.18)',
  warning: '#FFC048',
  warningSoft: 'rgba(255,192,72,0.18)',
  danger: '#FF8A7A',
  dangerSoft: 'rgba(255,138,122,0.18)',

  skeleton: '#353B4A',
  shadow: '#000000',
  /* Was darker than the surface, which made the bar look detached. Matching the
     surface lets the fade rail do the separating instead. */
  tabBar: '#2A2F3C',
  statusBar: 'light',

  gradients: gradientsDark,
  play: Play,
};

export const Palettes: Record<ColorScheme, Palette> = { light, dark };

// ── Scale ─────────────────────────────────────────────────────────────────────
export const Spacing = {
  /** 2 */ xxs: 2,
  /** 4 */ xs: 4,
  /** 8 */ sm: 8,
  /** 12 */ md: 12,
  /** 16 */ lg: 16,
  /** 20 */ xl: 20,
  /** 24 */ xxl: 24,
  /** 32 */ xxxl: 32,
  /** 40 */ huge: 40,
  /** 56 */ giant: 56,
} as const;

/**
 * Tightened one step across the board.
 *
 * `md` is what cards use, and it moves 14 → 10: clearly more deliberate than
 * the old soft rounding, nowhere near the hard-edged 6 that reads as poster
 * art. Everything above it is pulled in proportionally so a sheet does not
 * end up rounder than the card inside it. `pill` is untouched.
 *
 * Because 157 of the 285 `borderRadius` usages in `mobile/` already reference
 * this object, editing these seven numbers does most of the geometry change on
 * its own. The remaining hardcoded literals are a separate, mechanical sweep.
 */
export const Radii = {
  xs: 5,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 26,
  /** Buttons, chips, segmented controls and icon buttons. Same number as `md`
   *  today, but named so a button never inherits a card's rounding by accident. */
  button: 10,
  pill: 999,
} as const;

/** Generous touch targets — a 12-year-old's thumb is not a mouse pointer. */
export const HitSize = {
  min: 44,
  comfortable: 52,
} as const;

export const FontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  black: 'Inter_800ExtraBold',
  /** Condensed sports display — headlines, big numbers, tier labels.
   *  Dropped from 700 to 600: still unmistakably sporting, no longer shouting.
   *  Both weights are already in the `useFonts` call, so this costs nothing. */
  display: 'SairaCondensed_600SemiBold',
  displayBlack: 'SairaCondensed_700Bold',
  /** The big title at the top of a tab: Discover, Trials, Play. Bebas Neue,
   *  capitals only. Bundled in assets/fonts (OFL), loaded in app/_layout.tsx.
   *  Everything else that is a title stays Saira. */
  screenTitle: 'BebasNeue_400Regular',
  /** Small numbers — counts, points, times. Inter, like the rest of the text;
   *  the `number` variants add tabular digits so a count that updates in place
   *  does not jitter sideways. Big scores stay in `display`. (Was JetBrains
   *  Mono: the app keeps to two faces, Saira for titles and Inter for text.) */
  mono: 'Inter_600SemiBold',
  monoBold: 'Inter_700Bold',
  /** Names — every person, coach and club name. Inter, so a name reads like
   *  the text around it. (Was Barlow Semi Condensed.) */
  name: 'Inter_600SemiBold',
  nameBold: 'Inter_700Bold',
} as const;

export const FontSize = {
  xxs: 11,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 34,
  display: 44,
  hero: 56,
} as const;

export const LineHeight = {
  tight: 1.15,
  snug: 1.3,
  normal: 1.45,
  relaxed: 1.6,
} as const;

export const Duration = {
  fast: 140,
  base: 220,
  slow: 340,
} as const;

/**
 * Depth, flattened.
 *
 * The old ramp blurred up to 30px at 13% opacity in light mode, which made
 * every card hover above the page — the social-feed default. These values are
 * roughly a third of that: enough to separate a sheet from what is behind it,
 * not enough to float. The visible "machined" edge on a card comes from a
 * 1px highlight along its top and a slightly darker line along its bottom,
 * which belongs in `components/ui/Card.tsx`, not here.
 *
 * Signature unchanged, and this is the only place in `mobile/` that defines
 * shadow values — 14 call sites read it — so app-wide depth is this one map.
 */
/**
 * Dark mode only: what makes a card or control sit above the page — a soft
 * shadow under it and a lit top edge. Light mode returns nothing; it already
 * separates with white on lavender.
 */
export function raised(palette: Palette, strength: 'card' | 'control') {
  if (palette.scheme !== 'dark') return {};
  const card = strength === 'card';
  return {
    /* A top border a shade lighter than the sides reads as light falling on
       the top edge. Controls are lighter already, so their edge is too. */
    borderTopColor: card ? palette.edgeLight : '#5B6479',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: card ? 8 : 3 },
    shadowOpacity: card ? 0.4 : 0.3,
    shadowRadius: card ? 18 : 8,
    elevation: card ? 4 : 2,
  };
}

export function elevation(palette: Palette, level: 0 | 1 | 2 | 3) {
  if (level === 0) return {};
  const isDark = palette.scheme === 'dark';
  const map = {
    1: { h: 1, r: 3, o: isDark ? 0.3 : 0.035, e: 1 },
    2: { h: 3, r: 8, o: isDark ? 0.38 : 0.055, e: 3 },
    3: { h: 6, r: 16, o: isDark ? 0.45 : 0.08, e: 6 },
  } as const;
  const m = map[level];
  return {
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: m.o,
    shadowRadius: m.r,
    elevation: m.e,
  };
}

/** Hex + alpha → rgba string. Accepts #RGB or #RRGGBB. */
export function alpha(hex: string, a: number): string {
  if (hex.startsWith('rgba')) return hex;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// ── The logo's two halves ─────────────────────────────────────────────────────
/*
 * The A is cool on the climb and on fire on the way down, and the app's colour
 * rule follows it: blue is people and posts, fire is something you can act on
 * (a trial, a challenge, a deadline, an offer). Where both halves meet in one
 * object (a new story, the + button, the open tab) it is split like the A.
 */
export const LogoColors = {
  sky: '#26A9F5',
  cobalt: '#2F6BFF',
  deep: '#2348D8',
  amber: '#FFB347',
  /** A saved bookmark: deep enough to read on white. */
  gold: '#F5A300',
  flame: '#FF7A2C',
  ember: '#E8372B',
  /** Words on a soft flame tint. */
  flameInk: '#B5410A',
  flameInkDark: '#FFB27A',
} as const;

/** The split: blue to the middle, then fire. Use with `locations`. */
/**
 * The unseen-story ring: colour travels around the circle, clockwise from the
 * top right. Orange runs to a reddish middle and ends in a touch of yellow;
 * right where the yellow ends, blue starts as a deep purple and brightens to
 * sky blue by the top. Angles are degrees clockwise from 12 o'clock.
 */
export const StorySweep: readonly (readonly [number, string])[] = [
  [45, '#FF8A2C'],
  [85, '#FF6A2C'],
  [135, '#EE3F2A'],
  [185, '#FF6A2C'],
  [210, '#FF9A3A'],
  [225, '#FFC24A'],
  [225, '#5B2FC9'],
  [245, '#5E3FE0'],
  [295, '#3D57F0'],
  [335, '#2F6BFF'],
  [405, '#26A9F5'],
];

export const LogoSplit = {
  colors: [LogoColors.sky, LogoColors.cobalt, LogoColors.flame, LogoColors.ember] as const,
  locations: [0, 0.49, 0.51, 1] as const,
};

/* One sweep across the whole 0–100 scale: blue for a low reading, warming to
   ember as it climbs. A score or a match is coloured by where it sits on it. */
const SWEEP: readonly [number, string][] = [
  [0, LogoColors.sky],
  [0.45, LogoColors.cobalt],
  [0.62, LogoColors.amber],
  [0.82, LogoColors.flame],
  [1, LogoColors.ember],
];

/* Blending happens in OKLCH, the way the eye sees colour, not in plain RGB.
   In RGB, blue to amber passes through a flat grey-mauve and then olive (the
   muddy patch on the ring); in OKLCH the hue turns the short way round, so the
   same two colours meet in a clean, bright pink. The stops are unchanged. */
type Oklch = [number, number, number];

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const fromLinear = (c: number) =>
  255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

function hexToOklch(hex: string): Oklch {
  const n = parseInt(hex.slice(1), 16);
  const r = toLinear((n >> 16) & 255);
  const g = toLinear((n >> 8) & 255);
  const b = toLinear(n & 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}

function oklchToHex([L, C, H]: Oklch): string {
  const A = C * Math.cos(H);
  const B = C * Math.sin(H);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.max(0, Math.min(255, Math.round(fromLinear(c)))));
  const n = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
  return `#${n.toString(16).padStart(6, '0').toUpperCase()}`;
}

function mixOklch(a: string, b: string, t: number): string {
  const [l0, c0, h0] = hexToOklch(a);
  const [l1, c1, h1] = hexToOklch(b);
  let dh = h1 - h0;
  if (dh > Math.PI) dh -= 2 * Math.PI;
  if (dh < -Math.PI) dh += 2 * Math.PI;
  return oklchToHex([l0 + (l1 - l0) * t, c0 + (c1 - c0) * t, h0 + dh * t]);
}

/* Rings draw a hundred slices each, so the sweep is worked out once, in
   half-percent steps, and looked up after that. */
const SWEEP_STEPS = 200;
let sweepTable: string[] | null = null;

function sweepExact(x: number): string {
  for (let i = 1; i < SWEEP.length; i++) {
    const [p1, c1] = SWEEP[i];
    const [p0, c0] = SWEEP[i - 1];
    if (x <= p1) return mixOklch(c0, c1, (x - p0) / (p1 - p0));
  }
  return SWEEP[SWEEP.length - 1][1];
}

/** The sweep's colour at `t` (0–1). */
export function sweepAt(t: number): string {
  const x = Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0;
  if (!sweepTable) {
    sweepTable = Array.from({ length: SWEEP_STEPS + 1 }, (_, i) => sweepExact(i / SWEEP_STEPS));
  }
  return sweepTable[Math.round(x * SWEEP_STEPS)];
}
