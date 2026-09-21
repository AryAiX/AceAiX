/**
 * AceAiX design tokens — "Pitch & Pulse"
 *
 * Built for an audience of 10–25 year old athletes, with parents and coaches
 * looking over their shoulder. Energetic without being childish; calm enough
 * that an adult trusts it with a minor's profile.
 *
 * Every colour is defined for BOTH schemes. Never reference a raw hex in a
 * screen — always go through `useTheme()`.
 */

export type ColorScheme = 'light' | 'dark';

// ── Brand constants (identical across schemes) ────────────────────────────────
export const Brand = {
  /** Ace Orange — the energy. Primary actions, active states, the logo mark. */
  orange: '#FF5A1F',
  orangeBright: '#FF7A45',
  /** Volt — reserved for the Talent Score and nothing else. Scarcity = meaning. */
  volt: '#C9F03C',
  /** Azure — verification, trust, links. */
  azure: '#2E7DF6',
  azureBright: '#5B9BFF',
  ink: '#14161A',
  paper: '#FFFFFF',
} as const;

/**
 * The play colours.
 *
 * Six saturated hues that exist to be *used* — on cards, chips, tiles and
 * gradients — so a screen full of information is not a screen full of grey.
 * They are deliberately not semantic: nothing means "this is a warning". Pick
 * one with `hueFor(seed)` and a given team, sport or challenge keeps its colour
 * everywhere it appears.
 */
export const Play = {
  flame: '#FF5A1F',
  magenta: '#F0308C',
  violet: '#8B5CF6',
  azure: '#2E7DF6',
  cyan: '#12C2E9',
  mint: '#10D5A0',
  lime: '#C9F03C',
  amber: '#FFB020',
} as const;

export type PlayHue = keyof typeof Play;

const HUE_ORDER: PlayHue[] = [
  'flame',
  'azure',
  'violet',
  'mint',
  'magenta',
  'cyan',
  'amber',
  'lime',
];

function hueIndex(seed: string | null | undefined): number {
  if (!seed) return 1; // azure
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
 * Not a metal ramp any more.
 *
 * `rising` and `silver` used to be two greys, and since the profile cover, the
 * score ring and every avatar ring are painted from this map, most of the app
 * was grey for most people — the lower your score, the duller the app looked,
 * which is precisely backwards for a fourteen-year-old who has just joined.
 * Every tier now has a colour of its own, and the ramp still reads as a ramp:
 * cool and electric at the bottom, hot and metallic at the top.
 */
export const TierColors = {
  rising: '#12C2E9',   // 0–39   electric cyan
  bronze: '#10D5A0',   // 40–54  mint
  silver: '#8B5CF6',   // 55–69  violet
  gold: '#FFB020',     // 70–84  amber
  elite: '#FF3D7F',    // 85–100 hot pink-orange
} as const;

/** Second stop for the tier gradients, so a tier is a sweep and not a swatch. */
export const TierColorsEnd = {
  rising: '#5B9BFF',
  bronze: '#12C2E9',
  silver: '#F0308C',
  gold: '#FF7A45',
  elite: '#FF9E1F',
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
 */
export interface GradientSet {
  /** Primary actions. Flame → magenta. */
  action: readonly [string, string, string];
  /** The Talent Score, and nothing else. */
  score: readonly [string, string, string];
  /** Big headers and covers. */
  hero: readonly [string, string, string];
  /** Discovery, teams, anything that should feel like open air. */
  cool: readonly [string, string, string];
  /** Streaks, challenges, anything with a clock on it. */
  warm: readonly [string, string, string];
  /** Celebrations only. */
  party: readonly [string, string, string];
}

const gradientsLight: GradientSet = {
  action: ['#FF6A2C', '#FF3D7F', '#F0308C'],
  score: ['#8CE614', '#12C2E9', '#2E7DF6'],
  hero: ['#6D6BFF', '#B14BF4', '#FF3D7F'],
  cool: ['#12C2E9', '#5B9BFF', '#8B5CF6'],
  warm: ['#FFB020', '#FF7A45', '#FF3D7F'],
  party: ['#FF3D7F', '#8B5CF6', '#12C2E9'],
};

const gradientsDark: GradientSet = {
  action: ['#FF7A45', '#FF4E8C', '#E52C86'],
  score: ['#A8F03C', '#22D3EE', '#5B9BFF'],
  hero: ['#7C7AFF', '#B14BF4', '#FF4E8C'],
  cool: ['#22D3EE', '#6BA6FF', '#9B6BFF'],
  warm: ['#FFC048', '#FF8A5C', '#FF4E8C'],
  party: ['#FF4E8C', '#9B6BFF', '#22D3EE'],
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

  accent: string;        // Volt — score only
  accentSoft: string;
  onAccent: string;

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

  /* Was #F6F6F3 — a warm grey that turned every screen the colour of newsprint.
     These carry a trace of violet instead, which reads as light rather than as
     "unpainted" and gives the coloured cards something to sit on. */
  bg: '#F7F6FD',
  surface: '#FFFFFF',
  surfaceAlt: '#F1EFFB',
  surfaceSunken: '#E9E6F7',
  surfaceInverse: '#161327',
  overlay: 'rgba(22,19,39,0.55)',
  scrim: 'rgba(22,19,39,0.08)',

  border: '#E6E2F4',
  borderStrong: '#CFC9E6',
  divider: '#EEEBF8',

  text: '#161327',
  textSecondary: '#514C6B',
  textMuted: '#847EA0',
  textInverse: '#FFFFFF',
  textOnBrand: '#FFFFFF',

  primary: '#F5451B',
  primaryPressed: '#D8380F',
  primarySoft: '#FFEBE3',
  primaryBorder: '#FFCDB6',

  accent: '#7BC70A',
  accentSoft: '#EEFBD2',
  onAccent: '#161327',

  info: '#2E7DF6',
  infoSoft: '#E6F0FE',
  success: '#0E9F63',
  successSoft: '#E1F7EC',
  warning: '#E07A05',
  warningSoft: '#FEF1DE',
  danger: '#E0294B',
  dangerSoft: '#FDE9ED',

  skeleton: '#E9E6F7',
  shadow: '#2A2350',
  tabBar: '#FFFFFF',
  statusBar: 'dark',

  gradients: gradientsLight,
  play: Play,
};

const dark: Palette = {
  scheme: 'dark',

  /* Was a blue-grey near-black. Now an indigo one: the same contrast, but the
     saturated hues on top of it stop looking like stickers on a slab. */
  bg: '#0B0A16',
  surface: '#17152A',
  surfaceAlt: '#221F3A',
  surfaceSunken: '#0F0D1C',
  surfaceInverse: '#FFFFFF',
  overlay: 'rgba(6,5,14,0.72)',
  scrim: 'rgba(255,255,255,0.07)',

  border: '#2C2945',
  borderStrong: '#413D62',
  divider: '#241F3C',

  text: '#F4F3FA',
  textSecondary: '#ADA8C6',
  textMuted: '#7C769B',
  textInverse: '#161327',
  textOnBrand: '#FFFFFF',

  primary: '#FF7A45',
  primaryPressed: '#FF9463',
  primarySoft: 'rgba(255,122,69,0.18)',
  primaryBorder: 'rgba(255,122,69,0.38)',

  accent: '#C9F03C',
  accentSoft: 'rgba(201,240,60,0.18)',
  onAccent: '#161327',

  info: '#6BA6FF',
  infoSoft: 'rgba(107,166,255,0.18)',
  success: '#32D583',
  successSoft: 'rgba(50,213,131,0.18)',
  warning: '#FFC048',
  warningSoft: 'rgba(255,192,72,0.18)',
  danger: '#FF6B87',
  dangerSoft: 'rgba(255,107,135,0.18)',

  skeleton: '#221F3A',
  shadow: '#000000',
  tabBar: '#100E1E',
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

export const Radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  xxl: 32,
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
  /** Condensed sports display — headlines, big numbers, tier labels. */
  display: 'SairaCondensed_700Bold',
  displayBlack: 'SairaCondensed_800ExtraBold',
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

export function elevation(palette: Palette, level: 0 | 1 | 2 | 3) {
  if (level === 0) return {};
  const isDark = palette.scheme === 'dark';
  const map = {
    1: { h: 2, r: 8, o: isDark ? 0.4 : 0.06, e: 2 },
    2: { h: 6, r: 18, o: isDark ? 0.5 : 0.09, e: 6 },
    3: { h: 12, r: 30, o: isDark ? 0.6 : 0.13, e: 12 },
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
