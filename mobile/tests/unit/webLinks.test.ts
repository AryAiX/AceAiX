import { describe, expect, it } from 'vitest';

import { DEEP_LINK_PREFIXES } from '@/lib/routes';
import { WEB_APP_ORIGIN, webAppLink } from '@/lib/webLinks';

describe('V2 web links', () => {
  it('uses the requested dev host without an /app prefix', () => {
    expect(WEB_APP_ORIGIN).toBe('https://dev.aceaix.com');
    expect(webAppLink('/post/123')).toBe('https://dev.aceaix.com/post/123');
    expect(webAppLink('u/456')).toBe('https://dev.aceaix.com/u/456');
  });

  it('advertises the same host as a deep-link prefix', () => {
    expect(DEEP_LINK_PREFIXES).toContain('https://dev.aceaix.com');
  });
});
