/**
 * The languages AceAiX ships in.
 *
 * English is the source of truth: every other catalogue is typed against it,
 * so a missing key is a compile error rather than a blank label on someone's
 * screen. `nativeName` is what the person sees — nobody looking for Arabic is
 * scanning a list for the word "Arabic".
 */

export const LANGUAGES = [
  { code: 'en', name: 'English',    nativeName: 'English',  dir: 'ltr' },
  { code: 'ar', name: 'Arabic',     nativeName: 'العربية',  dir: 'rtl' },
  { code: 'es', name: 'Spanish',    nativeName: 'Español',  dir: 'ltr' },
  { code: 'fr', name: 'French',     nativeName: 'Français', dir: 'ltr' },
  { code: 'de', name: 'German',     nativeName: 'Deutsch',  dir: 'ltr' },
  { code: 'ru', name: 'Russian',    nativeName: 'Русский',  dir: 'ltr' },
  { code: 'zh', name: 'Chinese',    nativeName: '中文',      dir: 'ltr' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];
export type TextDirection = 'ltr' | 'rtl';

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as readonly LanguageCode[];

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (LANGUAGE_CODES as readonly string[]).includes(value);
}

export function languageMeta(code: LanguageCode) {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

export function directionFor(code: LanguageCode): TextDirection {
  return languageMeta(code).dir;
}

/**
 * Best match for a device locale tag such as "ar-AE", "zh-Hans-CN" or "pt-BR".
 * Falls back to English rather than guessing at a near neighbour.
 */
export function resolveDeviceLanguage(tags: readonly string[]): LanguageCode {
  for (const tag of tags) {
    const base = tag.toLowerCase().split(/[-_]/)[0];
    if (isLanguageCode(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}
