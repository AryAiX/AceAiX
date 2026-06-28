import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../..');
const scannedDirs = ['app', 'components', 'context', 'hooks', 'lib'];
const bannedPatterns = [
  /Manchester United/i,
  /Al Nassr/i,
  /Al Jazira/i,
  /AC Milan/i,
  /Barcelona/i,
  /PSG/i,
  /Aisha Al-Rashid/i,
  /Diego Santos/i,
  /Karim Al-Hassan/i,
  /Static demo data/i,
  /Use Demo Photo/i,
  /upsertDemoResults/i,
  /mock results/i,
  /2,847/i,
  /1,240/i,
];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    return [fullPath];
  });
}

describe('hardcoded data guardrails', () => {
  it('does not contain banned prototype fixture data in runtime source', () => {
    const files = scannedDirs.flatMap((dir) => walk(path.join(repoRoot, dir)));
    const offenders = files.flatMap((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return bannedPatterns
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${path.relative(repoRoot, file)} matched ${pattern}`);
    });

    expect(offenders).toEqual([]);
  });
});
