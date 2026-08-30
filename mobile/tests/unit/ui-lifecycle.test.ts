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

/** Extract the attribute text of every `<Modal ...>` opening tag in a file. */
function modalOpeningTags(source: string): string[] {
  const tags: string[] = [];
  const pattern = /<Modal\b/g;
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
      modalOpeningTags(source)
        .filter((tag) => !tag.includes('onRequestClose'))
        .map(() => `${file} renders a <Modal> without onRequestClose`),
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
