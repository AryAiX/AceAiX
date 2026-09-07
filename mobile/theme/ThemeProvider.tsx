import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ColorScheme,
  Duration,
  FontFamily,
  FontSize,
  GradientSet,
  HitSize,
  LineHeight,
  Palette,
  Palettes,
  Play,
  Radii,
  Spacing,
  alpha,
  elevation,
  hueFor,
  huePair,
} from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'aceaix.theme-preference';

export interface Theme {
  colors: Palette;
  scheme: ColorScheme;
  spacing: typeof Spacing;
  radii: typeof Radii;
  font: typeof FontFamily;
  size: typeof FontSize;
  lineHeight: typeof LineHeight;
  hit: typeof HitSize;
  duration: typeof Duration;
  elevation: (level: 0 | 1 | 2 | 3) => ReturnType<typeof elevation>;
  alpha: typeof alpha;
  /** Scheme-aware gradient stops. Same object as `colors.gradients`. */
  gradients: GradientSet;
  /** The eight play hues, and a stable pick from a string. */
  play: typeof Play;
  hueFor: typeof hueFor;
  huePair: typeof huePair;
}

interface ThemeContextValue extends Theme {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** True until the stored preference has been read from disk. */
  hydrating: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      })
      .catch(() => {
        /* first launch, or storage unavailable — system default is fine */
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      /* preference is cosmetic — never block the UI on a failed write */
    });
  }, []);

  const scheme: ColorScheme =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeContextValue>(() => {
    const colors = Palettes[scheme];
    return {
      colors,
      scheme,
      spacing: Spacing,
      radii: Radii,
      font: FontFamily,
      size: FontSize,
      lineHeight: LineHeight,
      hit: HitSize,
      duration: Duration,
      elevation: (level) => elevation(colors, level),
      alpha,
      gradients: colors.gradients,
      play: Play,
      hueFor,
      huePair,
      preference,
      setPreference,
      hydrating,
    };
  }, [scheme, preference, setPreference, hydrating]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

/**
 * Build a StyleSheet-shaped object from the current theme.
 * Memoised on scheme so styles are recomputed only when the palette flips.
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme.scheme]); // eslint-disable-line react-hooks/exhaustive-deps
}
