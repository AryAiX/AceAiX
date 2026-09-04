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

// ── Talent tier ramp ──────────────────────────────────────────────────────────
export const TierColors = {
  rising: '#8A8F99',   // 0–39
  bronze: '#C08457',   // 40–54
  silver: '#9AA5B1',   // 55–69
  gold: '#E8B426',     // 70–84
  elite: '#FF5A1F',    // 85–100
} as const;

export type Tier = keyof typeof TierColors;

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
}

const light: Palette = {
  scheme: 'light',

  bg: '#F6F6F3',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F1ED',
  surfaceSunken: '#EAEAE5',
  surfaceInverse: '#14161A',
  overlay: 'rgba(20,22,26,0.55)',
  scrim: 'rgba(20,22,26,0.08)',

  border: '#E4E4DE',
  borderStrong: '#D0D0C8',
  divider: '#EDEDE8',

  text: '#14161A',
  textSecondary: '#4F545D',
  textMuted: '#868C96',
  textInverse: '#FFFFFF',
  textOnBrand: '#FFFFFF',

  primary: '#F04E12',
  primaryPressed: '#D4400A',
  primarySoft: '#FFEDE4',
  primaryBorder: '#FFD2BC',

  accent: '#C9F03C',
  accentSoft: '#F2FBD3',
  onAccent: '#14161A',

  info: '#2E7DF6',
  infoSoft: '#E6F0FE',
  success: '#0E9F63',
  successSoft: '#E3F7EE',
  warning: '#D97706',
  warningSoft: '#FEF2E0',
  danger: '#DC3A2E',
  dangerSoft: '#FDECEA',

  skeleton: '#E8E8E2',
  shadow: '#14161A',
  tabBar: '#FFFFFF',
  statusBar: 'dark',
};

const dark: Palette = {
  scheme: 'dark',

  bg: '#0B0D11',
  surface: '#15181E',
  surfaceAlt: '#1D212A',
  surfaceSunken: '#0F1216',
  surfaceInverse: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.7)',
  scrim: 'rgba(255,255,255,0.06)',

  border: '#252A34',
  borderStrong: '#353B47',
  divider: '#1F242D',

  text: '#F3F4F7',
  textSecondary: '#A6ACB8',
  textMuted: '#767D8A',
  textInverse: '#14161A',
  textOnBrand: '#FFFFFF',

  primary: '#FF6B33',
  primaryPressed: '#FF854F',
  primarySoft: 'rgba(255,107,51,0.16)',
  primaryBorder: 'rgba(255,107,51,0.36)',

  accent: '#C9F03C',
  accentSoft: 'rgba(201,240,60,0.16)',
  onAccent: '#14161A',

  info: '#5B9BFF',
  infoSoft: 'rgba(91,155,255,0.16)',
  success: '#32D583',
  successSoft: 'rgba(50,213,131,0.16)',
  warning: '#FDB022',
  warningSoft: 'rgba(253,176,34,0.16)',
  danger: '#FF6B5F',
  dangerSoft: 'rgba(255,107,95,0.16)',

  skeleton: '#1F242D',
  shadow: '#000000',
  tabBar: '#101318',
  statusBar: 'light',
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
