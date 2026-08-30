import { describe, expect, it } from 'vitest';
import { safeInternalPath } from './navigation';

describe('safe internal navigation', () => {
  it('allows application-relative routes', () => {
    expect(safeInternalPath('/athlete/messages?thread=123#latest')).toBe('/athlete/messages?thread=123#latest');
  });

  it('rejects external, protocol-relative, and backslash URLs', () => {
    expect(safeInternalPath('https://evil.example/phish')).toBeNull();
    expect(safeInternalPath('//evil.example/phish')).toBeNull();
    expect(safeInternalPath('/\\evil.example/phish')).toBeNull();
  });

  it('rejects absent values', () => {
    expect(safeInternalPath(null)).toBeNull();
    expect(safeInternalPath('')).toBeNull();
  });
});
