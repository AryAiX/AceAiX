import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  REQUIRED_PARITY_LANGUAGES,
  REQUIRED_PARITY_SCHEMES,
  REQUIRED_PARITY_VIEWPORTS,
  SCREEN_PARITY,
} from '../parity/screenManifest';
import { PLATFORM_PARITY } from '../parity/platformManifest';

const APP = path.resolve(__dirname, '../../app');

function routeFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(absolute);
    if (!entry.name.endsWith('.tsx') || entry.name === '_layout.tsx') return [];
    return [path.relative(APP, absolute).split(path.sep).join('/')];
  });
}

describe('web parity manifest', () => {
  it('accounts for every Expo Router screen exactly once', () => {
    const actual = routeFiles(APP).sort();
    const declared = SCREEN_PARITY.map((entry) => entry.source).sort();

    expect(new Set(declared).size).toBe(declared.length);
    expect(declared).toEqual(actual);
  });

  it('does not allow a screen without access, states, or actions', () => {
    for (const entry of SCREEN_PARITY) {
      expect(entry.browserPath, `${entry.source}: browserPath`).toMatch(/^\//);
      expect(entry.access.length, `${entry.source}: access`).toBeGreaterThan(0);
      expect(entry.states.length, `${entry.source}: states`).toBeGreaterThan(0);
      expect(entry.actions.length, `${entry.source}: actions`).toBeGreaterThan(0);
    }
  });

  it('keeps completion honest until browser evidence exists', () => {
    const invalid = SCREEN_PARITY.filter(
      (entry) => !['unverified', 'render-only', 'verified'].includes(entry.coverage),
    );
    expect(invalid).toEqual([]);
  });

  it('requires mobile, tablet, desktop, both schemes, all seven languages, and RTL', () => {
    expect(REQUIRED_PARITY_VIEWPORTS.map(({ name }) => name)).toEqual([
      'mobile',
      'tablet',
      'desktop',
    ]);
    expect(REQUIRED_PARITY_SCHEMES).toEqual(['light', 'dark']);
    expect(REQUIRED_PARITY_LANGUAGES).toEqual(['en', 'ar', 'de', 'es', 'fr', 'ru', 'zh']);
    expect(REQUIRED_PARITY_LANGUAGES).toContain('ar');
  });

  it('tracks every browser platform capability with explicit acceptance criteria', () => {
    expect(PLATFORM_PARITY.length).toBeGreaterThan(0);
    expect(new Set(PLATFORM_PARITY.map(({ capability }) => capability)).size).toBe(
      PLATFORM_PARITY.length,
    );
    for (const entry of PLATFORM_PARITY) {
      expect(entry.implementation.length, `${entry.capability}: implementation`).toBeGreaterThan(0);
      expect(entry.acceptance.length, `${entry.capability}: acceptance`).toBeGreaterThan(0);
      expect(['blocked', 'unverified', 'verified']).toContain(entry.status);
      if (entry.status === 'blocked') {
        expect(entry.blocker, `${entry.capability}: blocker`).toBeTruthy();
      }
    }
  });
});
