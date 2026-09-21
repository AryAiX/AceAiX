import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { en } from '@/i18n/locales/en';
import { LANGUAGES } from '@/i18n/languages';

/**
 * Catalogue parity.
 *
 * English is the source of truth. Every other language must define exactly the
 * same keys — no more, no fewer — because a missing key falls back to English
 * mid-sentence and an extra one is dead weight nobody will ever notice is
 * wrong.
 *
 * The "still in English" check is a heuristic, not a rule: plenty of strings
 * are legitimately identical across languages (`AceAiX`, `{{n}}m`, "Padel").
 * It exists to catch a namespace that was copied and never translated, which
 * is the failure mode that actually happens.
 */

type Node = Record<string, unknown>;

function flatten(source: Node, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else if (value && typeof value === 'object') Object.assign(out, flatten(value as Node, path));
  }
  return out;
}

const ENGLISH = flatten(en as unknown as Node);
const ENGLISH_KEYS = Object.keys(ENGLISH).sort();

/**
 * Plural families.
 *
 * English needs two forms; Russian needs four and Arabic six, while Chinese
 * needs one. So a plural key is compared as a family — `common.likes` — and
 * each language is required to supply exactly the CLDR categories its own
 * grammar has, no more and no fewer.
 */
const PLURAL_SUFFIXES = ['zero', 'one', 'two', 'few', 'many', 'other'];

function pluralStem(key: string): string | null {
  for (const suffix of PLURAL_SUFFIXES) {
    if (key.endsWith(`_${suffix}`)) return key.slice(0, -(suffix.length + 1));
  }
  return null;
}

const ENGLISH_PLURAL_STEMS = new Set(
  ENGLISH_KEYS.map(pluralStem).filter((s): s is string => s !== null),
);

const ENGLISH_SINGULAR_KEYS = ENGLISH_KEYS.filter((k) => pluralStem(k) === null);

/** One English string per plural family, for the placeholder comparison. */
const ENGLISH_BY_STEM = new Map<string, string>();
for (const key of ENGLISH_KEYS) {
  const stem = pluralStem(key);
  if (stem && !ENGLISH_BY_STEM.has(stem)) ENGLISH_BY_STEM.set(stem, ENGLISH[key]);
}

/**
 * Strings that are the same in every language, or close enough to be.
 *
 * A placeholder's name is ours, not the reader's — `{{used}}/{{max}}` and
 * `{{label}} · {{hint}}` carry no words to translate, so they are stripped
 * before the string is judged. Without that, every layout-only template in the
 * catalogue reads as "still in English" in any language that writes with the
 * Latin alphabet.
 */
const PLACEHOLDER = /\{\{\w+\}\}/g;
const SAME_IN_ANY_LANGUAGE = /^[\s\d{}/%+.:,·•—–-]*$/;
const carriesNoWords = (text: string) =>
  SAME_IN_ANY_LANGUAGE.test(text.replace(PLACEHOLDER, ''));
const BRAND_OR_UNIT = new Set([
  'common.appName',
  'sports.padel',
  'sports.esports',
  'sports.position.mma',
  'sports.position.judo',
  'sports.position.karate',
  'sports.position.libero',
  'sports.position.pivot',
]);

/**
 * Every catalogue on disk, resolved by Vite at collection time.
 *
 * `require` cannot be used here: these are TypeScript modules that import each
 * other without file extensions, which Node's resolver will not follow. A glob
 * keeps the original contract — a language nobody has written yet is simply
 * absent from the map, so `loadLocale` returns null instead of throwing.
 */
const LOCALE_MODULES = (
  import.meta as unknown as {
    glob(pattern: string, options: { eager: true }): Record<string, Record<string, unknown>>;
  }
).glob('../../i18n/locales/*/index.ts', { eager: true });

function loadLocale(code: string): Node | null {
  const mod = LOCALE_MODULES[`../../i18n/locales/${code}/index.ts`];
  return (mod?.[code] ?? null) as Node | null;
}

describe('English catalogue', () => {
  it('is not empty and has no blank values', () => {
    expect(ENGLISH_KEYS.length).toBeGreaterThan(500);
    for (const [key, value] of Object.entries(ENGLISH)) {
      expect(value.trim().length, `${key} is blank`).toBeGreaterThan(0);
    }
  });

  it('uses {{double braces}} for every placeholder', () => {
    for (const [key, value] of Object.entries(ENGLISH)) {
      // A lone `${` would mean a template literal leaked into the catalogue.
      expect(value.includes('${'), `${key} contains a template literal`).toBe(false);
    }
  });
});

for (const lang of LANGUAGES.filter((l) => l.code !== 'en')) {
  describe(`${lang.name} (${lang.code})`, () => {
    const catalogue = loadLocale(lang.code);

    it('exists', () => {
      expect(catalogue, `mobile/i18n/locales/${lang.code} is missing`).not.toBeNull();
    });

    if (!catalogue) return;

    const flat = flatten(catalogue);
    const keys = Object.keys(flat).sort();

    it('defines exactly the English keys', () => {
      const singular = keys.filter((k) => pluralStem(k) === null);
      const missing = ENGLISH_SINGULAR_KEYS.filter((k) => !(k in flat));
      const extra = singular.filter((k) => !(k in ENGLISH));
      expect(missing, `missing keys in ${lang.code}`).toEqual([]);
      expect(extra, `unknown keys in ${lang.code}`).toEqual([]);
    });

    it('supplies the plural forms its own grammar needs', () => {
      const categories = new Intl.PluralRules(lang.code).resolvedOptions().pluralCategories;
      const stems = new Set(
        keys.map(pluralStem).filter((s): s is string => s !== null),
      );

      const missingFamilies = [...ENGLISH_PLURAL_STEMS].filter((s) => !stems.has(s));
      expect(missingFamilies, `plural families missing in ${lang.code}`).toEqual([]);

      const unknownFamilies = [...stems].filter((s) => !ENGLISH_PLURAL_STEMS.has(s));
      expect(unknownFamilies, `unknown plural families in ${lang.code}`).toEqual([]);

      for (const stem of ENGLISH_PLURAL_STEMS) {
        const present = PLURAL_SUFFIXES.filter((s) => `${stem}_${s}` in flat);
        expect(
          [...present].sort(),
          `${lang.code}.${stem} should define exactly: ${[...categories].sort().join(', ')}`,
        ).toEqual([...categories].sort());
      }
    });

    it('has no blank values', () => {
      for (const [key, value] of Object.entries(flat)) {
        expect(value.trim().length, `${lang.code}.${key} is blank`).toBeGreaterThan(0);
      }
    });

    it('keeps every placeholder the English string uses', () => {
      const placeholders = (s: string): string[] => (s.match(/\{\{(\w+)\}\}/g) ?? []).sort();

      for (const key of ENGLISH_SINGULAR_KEYS) {
        const value = flat[key];
        if (typeof value !== 'string') continue;
        expect(placeholders(value), `${lang.code}.${key} placeholders`).toEqual(
          placeholders(ENGLISH[key]),
        );
      }

      /* Plural forms are compared against their family's English string: a
         translated form may drop the count word but must not invent one. */
      for (const [stem, english] of ENGLISH_BY_STEM) {
        for (const suffix of PLURAL_SUFFIXES) {
          const value = flat[`${stem}_${suffix}`];
          if (typeof value !== 'string') continue;
          const extraVars = placeholders(value).filter((p) => !placeholders(english).includes(p));
          expect(extraVars, `${lang.code}.${stem}_${suffix} has unknown placeholders`).toEqual([]);
        }
      }
    });

    it('is actually translated', () => {
      const untranslated = ENGLISH_SINGULAR_KEYS.filter((key) => {
        if (BRAND_OR_UNIT.has(key)) return false;
        const value = flat[key];
        if (typeof value !== 'string') return false;
        if (carriesNoWords(ENGLISH[key])) return false;
        // Short tokens ("m", "h", "OK") collide by chance; only flag prose.
        if (ENGLISH[key].length < 8) return false;
        return value === ENGLISH[key];
      });

      // A handful of coincidences is fine; a wall of them means a namespace
      // was copied across without being translated.
      expect(
        untranslated.length,
        `${lang.code}: ${untranslated.length} strings identical to English, e.g. ${untranslated
          .slice(0, 8)
          .join(', ')}`,
      ).toBeLessThan(25);
    });
  });
}

// ── Every key a screen asks for exists ───────────────────────────────────────
/**
 * The type system guarantees the seven catalogues agree with each other. It
 * does not guarantee that `t('profile.tabMatches')` names a key any of them
 * has — `t` takes a string, so a typo or a renamed key falls through and the
 * raw path renders on screen, in production, in every language at once.
 *
 * This walks the source for literal `t('…')` calls and checks each against
 * English. Composed keys (`t(someVariable)`, template literals) are outside
 * what a regex can see and are skipped deliberately rather than guessed at.
 */
describe('keys the app actually asks for', () => {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const DIRS = ['app', 'components', 'hooks', 'lib', 'providers'];

  function sources(dir: string, found: string[] = []): string[] {
    if (!fs.existsSync(dir)) return found;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) sources(full, found);
      else if (/\.tsx?$/.test(entry.name)) found.push(full);
    }
    return found;
  }

  const used = new Map<string, string>();
  for (const dir of DIRS) {
    for (const file of sources(path.join(ROOT, dir))) {
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_]+\.[a-zA-Z0-9_.]+)'/g)) {
        if (!used.has(m[1])) used.set(m[1], path.relative(ROOT, file));
      }
    }
  }

  it('finds the calls at all, so a silent regex failure is not a pass', () => {
    expect(used.size).toBeGreaterThan(200);
  });

  it.each([...used.entries()])('%s exists in English (%s)', (key) => {
    /* Plural calls name the stem; the catalogue holds the CLDR variants. */
    const direct = key.split('.').reduce<unknown>(
      (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
      en,
    );
    if (typeof direct === 'string') return;

    const parts = key.split('.');
    const stem = parts.pop()!;
    const ns = parts.reduce<unknown>(
      (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
      en,
    );
    const plural =
      ns && typeof ns === 'object' &&
      Object.keys(ns as Record<string, unknown>).some((k) => k.startsWith(`${stem}_`));

    expect(plural, `${key} is not in the English catalogue`).toBe(true);
  });
});
