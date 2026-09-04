import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { I18nManager, NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { setGlobalTranslator } from '@/lib/i18n-bridge';

import {
  DEFAULT_LANGUAGE,
  LanguageCode,
  TextDirection,
  directionFor,
  isLanguageCode,
  resolveDeviceLanguage,
} from './languages';
import { en } from './locales/en';
import type { Translations } from './locales/en';

/**
 * Translation.
 *
 * English is the source of truth and is bundled eagerly, so the app always has
 * something to render even if another catalogue fails to load. The other six
 * are `require`d on demand — no reason to ship six unused dictionaries in the
 * first screen's bundle.
 *
 * Plurals go through `Intl.PluralRules`, which knows that Russian has four
 * forms and Arabic six. Writing `_one` / `_other` by hand would be wrong in
 * both languages.
 */

const STORAGE_KEY = 'aceaix.language';
const RTL_APPLIED_KEY = 'aceaix.rtl-applied';

export type { Translations };
export * from './languages';

type Catalogue = Translations;

const CATALOGUES: Record<LanguageCode, () => Catalogue> = {
  en: () => en,
  ar: () => require('./locales/ar').ar as Catalogue,
  es: () => require('./locales/es').es as Catalogue,
  fr: () => require('./locales/fr').fr as Catalogue,
  de: () => require('./locales/de').de as Catalogue,
  ru: () => require('./locales/ru').ru as Catalogue,
  zh: () => require('./locales/zh').zh as Catalogue,
};

function loadCatalogue(code: LanguageCode): Catalogue {
  try {
    return CATALOGUES[code]();
  } catch {
    // A broken or missing catalogue must never blank the interface.
    return en;
  }
}

/**
 * The device's preferred languages, most-wanted first.
 *
 * Read from the platform's own Intl data rather than a native localization
 * module — Hermes ships full ICU on both platforms, so this needs no extra
 * dependency and nothing to rebuild. It only pre-selects a row in the picker,
 * so a rough answer is fine and English is a safe miss.
 */
function deviceLanguageTags(): string[] {
  const tags: string[] = [];
  try {
    const nav = (globalThis as unknown as {
      navigator?: { languages?: readonly string[]; language?: string };
    }).navigator;
    if (nav?.languages?.length) tags.push(...nav.languages);
    else if (nav?.language) tags.push(nav.language);
  } catch {
    /* not a browser */
  }
  try {
    const resolved = new Intl.DateTimeFormat().resolvedOptions().locale;
    if (resolved) tags.push(resolved);
  } catch {
    /* Intl unavailable — English it is */
  }
  return tags;
}

// ── Key lookup ───────────────────────────────────────────────────────────────
type Vars = Record<string, string | number>;

function walk(source: unknown, path: string[]): unknown {
  let node: unknown = source;
  for (const part of path) {
    if (node == null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (whole, name: string) => {
    const value = vars[name];
    return value === undefined ? whole : String(value);
  });
}

/**
 * Resolve a dotted key against a catalogue, falling back to English and then
 * to the key itself — a visible key in the UI is a bug report; a blank space
 * is a mystery.
 */
function lookup(
  catalogue: Catalogue,
  key: string,
  code: LanguageCode,
  vars?: Vars,
): string {
  const path = key.split('.');
  let value = walk(catalogue, path);

  // Plural forms: `likes_one`, `likes_other`, and for Arabic `likes_zero` etc.
  if (value === undefined && vars && typeof vars.count === 'number') {
    const category = new Intl.PluralRules(code).select(vars.count);
    const last = path[path.length - 1];
    const stem = path.slice(0, -1);
    value =
      walk(catalogue, [...stem, `${last}_${category}`]) ??
      walk(catalogue, [...stem, `${last}_other`]);
  }

  if (typeof value !== 'string' && catalogue !== en) {
    return lookup(en, key, 'en', vars);
  }
  if (typeof value !== 'string') {
    if (__DEV__) console.warn(`[i18n] missing key: ${key}`);
    return key;
  }
  return interpolate(value, vars);
}

// ── Provider ─────────────────────────────────────────────────────────────────
export interface I18nContextValue {
  language: LanguageCode;
  direction: TextDirection;
  isRTL: boolean;
  /** True until the stored choice has been read from disk. */
  hydrating: boolean;
  /** False on the very first launch, before anyone has chosen. */
  hasChosen: boolean;
  t: (key: string, vars?: Vars) => string;
  setLanguage: (code: LanguageCode) => Promise<{ needsRestart: boolean }>;
  /** Locale-aware number formatting, e.g. for counts and scores. */
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (iso: string, options?: Intl.DateTimeFormatOptions) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [hasChosen, setHasChosen] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (isLanguageCode(stored)) {
          setLanguageState(stored);
          setHasChosen(true);
          return;
        }
        // Nobody has chosen yet. Pre-select the phone's language so the
        // picker opens on the most likely answer.
        setLanguageState(resolveDeviceLanguage(deviceLanguageTags()));
      })
      .catch(() => {
        /* storage unavailable — English, and ask again next launch */
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const catalogue = useMemo(() => loadCatalogue(language), [language]);
  const direction = directionFor(language);

  /* Errors are raised far from React — in services, hooks and catch blocks —
     so the translator is handed to lib/errors as a plain function rather than
     being reached through a hook. */
  useEffect(() => {
    setGlobalTranslator((key, vars) => lookup(catalogue, key, language, vars), language);
    return () => setGlobalTranslator(null);
  }, [catalogue, language]);

  const setLanguage = useCallback<I18nContextValue['setLanguage']>(
    async (code) => {
      const wasRTL = I18nManager.isRTL;
      const willBeRTL = directionFor(code) === 'rtl';

      setLanguageState(code);
      setHasChosen(true);
      await AsyncStorage.setItem(STORAGE_KEY, code).catch(() => {});

      if (wasRTL === willBeRTL) return { needsRestart: false };

      /* React Native lays out right-to-left at the native level. The flag can
         be set at any time, but existing views do not re-mirror, so the app
         has to come back up for the change to be complete. */
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(willBeRTL);
      await AsyncStorage.setItem(RTL_APPLIED_KEY, String(willBeRTL)).catch(() => {});

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.location.reload();
        return { needsRestart: false };
      }

      return { needsRestart: true };
    },
    [],
  );

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string, vars?: Vars) => lookup(catalogue, key, language, vars);
    return {
      language,
      direction,
      isRTL: direction === 'rtl',
      hydrating,
      hasChosen,
      t,
      setLanguage,
      formatNumber: (n, options) => new Intl.NumberFormat(language, options).format(n),
      formatDate: (iso, options) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        return new Intl.DateTimeFormat(
          language,
          options ?? { day: 'numeric', month: 'short', year: 'numeric' },
        ).format(d);
      },
    };
  }, [catalogue, language, direction, hydrating, hasChosen, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

/** The common case: `const t = useT();` then `t('feed.emptyTitle')`. */
export function useT(): (key: string, vars?: Vars) => string {
  return useI18n().t;
}

/**
 * Ask the platform to restart. Available in development and in builds that
 * include expo-updates; elsewhere the caller falls back to telling the person
 * to reopen the app, which is what `needsRestart` is for.
 */
export async function tryRestartApp(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.location.reload();
      return true;
    }
    return false;
  }
  try {
    const updates = require('expo-updates');
    if (updates?.reloadAsync) {
      await updates.reloadAsync();
      return true;
    }
  } catch {
    /* expo-updates is not part of this build */
  }
  try {
    const dev = NativeModules?.DevSettings;
    if (__DEV__ && dev?.reload) {
      dev.reload();
      return true;
    }
  } catch {
    /* not available in a release build */
  }
  return false;
}

/**
 * Set the native RTL flag as early as possible, before the first render, from
 * whatever was stored last time. Called once from the root layout.
 */
export async function primeLayoutDirection(): Promise<void> {
  try {
    I18nManager.allowRTL(true);
    const stored = await AsyncStorage.getItem(RTL_APPLIED_KEY);
    if (stored === 'true' && !I18nManager.isRTL) I18nManager.forceRTL(true);
    if (stored === 'false' && I18nManager.isRTL) I18nManager.forceRTL(false);
  } catch {
    /* direction stays as the platform left it */
  }
}
