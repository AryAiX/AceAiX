import { describe, expect, it } from 'vitest';
import { safeAppPath } from '@/lib/navigation';

describe('safeAppPath', () => {
  it('accepts internal app paths', () => {
    expect(safeAppPath('/(tabs)/messages?conversation=123')).toBe(
      '/(tabs)/messages?conversation=123',
    );
  });

  it.each([
    'https://evil.example/steal',
    '//evil.example/steal',
    '/\\evil.example/steal',
    'javascript:alert(1)',
    '/messages\nhttps://evil.example',
    '',
    null,
  ])('rejects unsafe route %p', (route) => {
    expect(safeAppPath(route)).toBeNull();
  });
});
