// ── Floodlight Telemetry Design System ────────────────────────────────────────

export const Colors = {
  // Backgrounds
  bg: '#0A0E14',           // Pitch Black — night stadium
  surface: '#121826',      // Floodlit Navy — primary card
  elevated: '#1A2233',     // Elevated — raised surfaces, drawer
  border: '#1E2A3A',       // Hairline borders
  borderSubtle: '#162030', // Near-invisible separator

  // Primary / accent
  primary: '#2E8BFF',           // Electric Azure — workhorse
  primaryGlow: '#5AA9FF',       // Azure glow variant
  primaryDim: 'rgba(46,139,255,0.12)',
  accent: '#C6F23A',            // Volt — single key metric per screen
  accentGlow: 'rgba(198,242,58,0.18)',
  accentDim: 'rgba(198,242,58,0.10)',

  // Semantic
  success: '#34D399',    // Signal Green — positive deltas
  warning: '#FFB020',    // Amber — draws/warnings
  error: '#FF5D5D',      // Flare Red — losses/alerts

  // Text
  textPrimary: '#EAF0F7',
  textMuted: '#8A97A8',
  textDisabled: '#5C6779',
  textFaint: '#3D4F63',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  giant: 64,
};

export const Radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const Typography = {
  family: {
    // Body / UI
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    // Display / headlines — ExtraBold for broadcast feel
    display: 'Inter_800ExtraBold',
    displayMedium: 'Inter_700Bold',
    // Data / telemetry — tracked SemiBold for precision look
    mono: 'Inter_600SemiBold',
    monoBold: 'Inter_700Bold',
  },
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 42,
    hero: 52,
  },
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  }),
};
