import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../..');
const scannedDirs = ['app', 'components', 'context', 'hooks', 'lib'];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (!/\.tsx?$/.test(entry.name)) return [];
    return [fullPath];
  });
}

function sourceFiles(): { file: string; source: string }[] {
  return scannedDirs
    .flatMap((dir) => walk(path.join(repoRoot, dir)))
    .map((file) => ({ file: path.relative(repoRoot, file), source: fs.readFileSync(file, 'utf8') }));
}

/**
 * Extract the attribute text of every JSX opening tag for `component`.
 *
 * The trailing whitespace requirement keeps generic type arguments such as
 * `useRef<TextInput>(null)` from being mistaken for an element.
 */
function openingTags(source: string, component: string): string[] {
  const tags: string[] = [];
  const pattern = new RegExp(`<${component}\\s`, 'g');
  let match = pattern.exec(source);
  while (match !== null) {
    const rest = source.slice(match.index);
    const end = rest.indexOf('>');
    tags.push(end === -1 ? rest : rest.slice(0, end));
    match = pattern.exec(source);
  }
  return tags;
}

describe('modal dismissal', () => {
  // Without onRequestClose the Android hardware back button does nothing, which
  // strands the user inside the modal. It is the platform analogue of the web
  // app's Escape-to-close handling.
  it('handles the Android hardware back button on every modal', () => {
    const offenders = sourceFiles().flatMap(({ file, source }) =>
      openingTags(source, 'Modal')
        .filter((tag) => !tag.includes('onRequestClose'))
        .map(() => `${file} renders a <Modal> without onRequestClose`),
    );

    expect(offenders).toEqual([]);
  });
});

describe('accessible names', () => {
  // react-native-web renders accessibilityLabel as aria-label, so this is the
  // same guarantee the web app's htmlFor/aria-label fixes provide.
  it('names every text input for assistive technology', () => {
    const offenders = sourceFiles().flatMap(({ file, source }) =>
      openingTags(source, 'TextInput')
        .filter((tag) => !tag.includes('accessibilityLabel'))
        .map(() => `${file} renders a <TextInput> without accessibilityLabel`),
    );

    expect(offenders).toEqual([]);
  });
});

describe('animation cleanup', () => {
  // A looping animation that is never stopped keeps running after its component
  // unmounts, which is the same leak the web count-up fix addressed.
  it('stops every looping animation it starts', () => {
    const offenders = sourceFiles()
      .filter(({ source }) => source.includes('Animated.loop('))
      .filter(({ source }) => !source.includes('.stop()'))
      .map(({ file }) => `${file} starts Animated.loop without ever calling .stop()`);

    expect(offenders).toEqual([]);
  });
});
