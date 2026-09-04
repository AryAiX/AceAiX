/**
 * A translator for code that runs outside React.
 *
 * Formatters and error mappers are called from services, hooks and catch
 * blocks — places with no context to read from — but their output is read by a
 * person and has to be in their language. `I18nProvider` registers the current
 * translator here on mount and clears it on unmount; until it does, callers
 * fall back to their own English strings.
 *
 * This is the only global of its kind in the app. It exists because the
 * alternative — threading `t` through every formatter call site — makes the
 * call sites worse without making anything safer.
 */

export type Translate = (key: string, vars?: Record<string, string | number>) => string;

let translator: Translate | null = null;
let activeLanguage = 'en';

export function setGlobalTranslator(fn: Translate | null, language = 'en'): void {
  translator = fn;
  activeLanguage = language;
}

/** The language currently in use, for Intl formatting outside React. */
export function currentLanguage(): string {
  return activeLanguage;
}

/**
 * Translate a key, or return `fallback` when no translator is registered or
 * the key is missing. Never returns a raw key to the interface.
 */
export function tr(
  key: string,
  fallback: string,
  vars?: Record<string, string | number>,
): string {
  if (!translator) return interpolate(fallback, vars);
  const result = translator(key, vars);
  if (!result || result === key) return interpolate(fallback, vars);
  return result;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (whole, name: string) =>
    vars[name] === undefined ? whole : String(vars[name]),
  );
}
