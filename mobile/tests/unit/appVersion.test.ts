import { describe, expect, it } from 'vitest';

import {
  chooseLaunchPrompt,
  compareVersions,
  decideUpdate,
  decideWhatsNew,
  versionNotesKey,
} from '@/lib/appVersion';

describe('compareVersions', () => {
  it('compares numeric parts, so 2.0.10 is newer than 2.0.9', () => {
    expect(compareVersions('2.0.10', '2.0.9')).toBe(1);
    expect(compareVersions('2.0.9', '2.0.10')).toBe(-1);
    expect(compareVersions('2.0.10', '2.0.10')).toBe(0);
  });

  it('treats a missing part as zero', () => {
    expect(compareVersions('2.0', '2.0.0')).toBe(0);
    expect(compareVersions('2', '2.0.0')).toBe(0);
    expect(compareVersions('2.1', '2.0.10')).toBe(1);
  });

  it('ignores leading zeros', () => {
    expect(compareVersions('2.0.09', '2.0.9')).toBe(0);
    expect(compareVersions('2.0.10', '2.0.09')).toBe(1);
  });
});

describe('decideUpdate', () => {
  const record = (latest: string | null, minimum: string | null = null) => ({
    latest,
    minimum,
  });

  it('requires an update below the minimum and ignores Later', () => {
    expect(decideUpdate('2.0.5', record('2.0.8', '2.0.6'), '2.0.8')).toBe('required');
    expect(decideUpdate('2.0.5', record('2.0.8', '2.0.6'), null)).toBe('required');
    expect(decideUpdate('2.0.9', record('2.0.4', '2.0.10'), null)).toBe('required');
  });

  it('does not require an update once the minimum is met', () => {
    expect(decideUpdate('2.0.6', record('2.0.8', '2.0.6'), null)).toBe('available');
    expect(decideUpdate('2.0.10', record('2.0.8', '2.0.9'), null)).toBe('none');
  });

  it('offers an update older than latest until that latest was dismissed', () => {
    expect(decideUpdate('2.0.5', record('2.0.6'), null)).toBe('available');
    expect(decideUpdate('2.0.5', record('2.0.6'), '2.0.6')).toBe('none');
    expect(decideUpdate('2.0.5', record('2.0.7'), '2.0.6')).toBe('available');
  });

  it('stays quiet when this build is current, or the row says nothing', () => {
    expect(decideUpdate('2.0.6', record('2.0.6'), null)).toBe('none');
    expect(decideUpdate('2.0.10', record('2.0.9'), null)).toBe('none');
    expect(decideUpdate('2.0.5', record(null, null), null)).toBe('none');
    expect(decideUpdate('2.0.5', record('  ', '  '), null)).toBe('none');
    expect(decideUpdate('2.0.5', null, null)).toBe('none');
    expect(decideUpdate('2.0.5', undefined, null)).toBe('none');
  });

  it('treats a blank minimum as unset, and trims the dismissed version', () => {
    expect(decideUpdate('2.0.5', record('2.0.6', '   '), null)).toBe('available');
    expect(decideUpdate('2.0.5', record('2.0.6'), '  2.0.6  ')).toBe('none');
  });
});

describe('decideWhatsNew', () => {
  it('skips the first install, even when this version has notes', () => {
    expect(decideWhatsNew('2.0.6', null, true)).toBe('skip');
    expect(decideWhatsNew('2.0.6', undefined, true)).toBe('skip');
    expect(decideWhatsNew('2.0.6', '   ', true)).toBe('skip');
  });

  it('shows notes only when this build is newer than the last one seen', () => {
    expect(decideWhatsNew('2.0.10', '2.0.9', true)).toBe('show');
    expect(decideWhatsNew('2.0.6', '2.0.5', true)).toBe('show');
    expect(decideWhatsNew('2.0.6', '2.0.6', true)).toBe('skip');
    expect(decideWhatsNew('2.0.5', '2.0.6', true)).toBe('skip');
  });

  it('skips a version that has no notes', () => {
    expect(decideWhatsNew('2.0.7', '2.0.6', false)).toBe('skip');
  });
});

describe('chooseLaunchPrompt', () => {
  it('shows at most one prompt: required, then what is new, then available', () => {
    expect(chooseLaunchPrompt('required', 'show')).toBe('required');
    expect(chooseLaunchPrompt('required', 'skip')).toBe('required');
    expect(chooseLaunchPrompt('available', 'show')).toBe('whatsNew');
    expect(chooseLaunchPrompt('none', 'show')).toBe('whatsNew');
    expect(chooseLaunchPrompt('available', 'skip')).toBe('available');
    expect(chooseLaunchPrompt('none', 'skip')).toBe('none');
  });
});

describe('versionNotesKey', () => {
  it('turns a version into the catalogue key', () => {
    expect(versionNotesKey('2.0.6')).toBe('v2_0_6');
    expect(versionNotesKey('2.0.10')).toBe('v2_0_10');
    expect(versionNotesKey('2.0.06')).toBe('v2_0_6');
  });
});
