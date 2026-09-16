import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * `lib/push.ts` and `lib/push.web.ts` are one module with two implementations,
 * and Metro picks between them by filename. Nothing typechecks the pair —
 * `tsc` resolves `@/lib/push` to the native file and never looks at the web
 * one — so a function added to one and forgotten in the other is not a type
 * error. It is a blank screen in the browser, at whatever moment the app first
 * calls the name that is missing.
 *
 * These read the two files and compare what they export. Reading source rather
 * than importing is deliberate: `push.ts` pulls in `expo-notifications` and
 * `react-native`, neither of which loads under a plain node test runner, and
 * the thing being checked is the shape of the pair, not their behaviour.
 */

const ROOT = path.resolve(__dirname, '../..');
const read = (file: string) => readFileSync(path.join(ROOT, 'lib', file), 'utf8');

const SKIP = new Set(['node_modules', '.expo', 'dist', 'web-build', '.git']);

function readdirRecursive(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) readdirRecursive(full, out);
    else out.push(full);
  }
  return out;
}

/** Exported value names: `export function x`, `export const x`, `export async function x`. */
function exportedValues(source: string): string[] {
  const names = new Set<string>();
  const re = /^export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z0-9_$]+)/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) names.add(match[1]);
  return [...names].sort();
}

/** Exported type names, which must agree too — the web file is the one that lies. */
function exportedTypes(source: string): string[] {
  const names = new Set<string>();
  const re = /^export\s+type\s+([A-Za-z0-9_$]+)/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) names.add(match[1]);
  return [...names].sort();
}

describe('lib/push and lib/push.web', () => {
  const native = read('push.ts');
  const web = read('push.web.ts');

  it('export exactly the same values', () => {
    expect(exportedValues(web)).toEqual(exportedValues(native));
  });

  it('export exactly the same types', () => {
    expect(exportedTypes(web)).toEqual(exportedTypes(native));
  });

  it('export something at all, so a broken regex cannot pass silently', () => {
    expect(exportedValues(native).length).toBeGreaterThan(5);
    expect(exportedTypes(native).length).toBeGreaterThan(0);
  });

  /**
   * The reason the split exists. Importing `expo-notifications` runs a
   * module-scope subscription to push token changes, which on web does nothing
   * but warn — so the web file must not import it, and no other file may
   * import it either, or the warning comes back through a different door.
   */
  it('never imports expo-notifications on the web side', () => {
    /* The comment in that file names the module, and should — this looks for
       an import or require of it, not a mention of it. */
    expect(web).not.toMatch(/(?:^|\n)\s*import[^\n]*['"]expo-notifications['"]/);
    expect(web).not.toMatch(/require\(\s*['"]expo-notifications['"]/);
    expect(web).not.toMatch(/import\(\s*['"]expo-notifications['"]/);
  });

  /**
   * And no third file may reach for it either, or the warning returns through
   * a different door — which is exactly what the old push-permission bridge in
   * `api.settings.ts` was doing.
   */
  it('is the only place in the app that touches expo-notifications', () => {
    const offenders = readdirRecursive(ROOT)
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .filter((f) => !f.includes('/node_modules/'))
      .filter((f) => !f.endsWith('lib/push.ts'))
      .filter((f) => !f.endsWith('tests/unit/push.test.ts'))
      /* Names the plugin to look its icon up in app.json. Configuring the
         plugin is not importing the module — the config is read by the
         prebuild, not bundled — so it is not what this guard is for. */
      .filter((f) => !f.endsWith('tests/unit/brandAssets.test.ts'))
      .filter((f) => /['"]expo-notifications['"]/.test(readFileSync(f, 'utf8')))
      .map((f) => path.relative(ROOT, f));

    expect(offenders).toEqual([]);
  });
});
