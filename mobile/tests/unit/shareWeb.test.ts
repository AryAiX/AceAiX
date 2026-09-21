import { afterEach, describe, expect, it, vi } from 'vitest';

import { shareContent } from '@/lib/share.web';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('browser sharing', () => {
  it('uses Web Share when the browser provides it', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, clipboard: { writeText: vi.fn() } });

    await expect(
      shareContent({ title: 'Athlete', message: 'Profile', url: 'https://dev.aceaix.com/u/1' }),
    ).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({
      title: 'Athlete',
      text: 'Profile',
      url: 'https://dev.aceaix.com/u/1',
    });
  });

  it('copies the canonical URL when Web Share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(
      shareContent({ message: 'Profile', url: 'https://dev.aceaix.com/u/1' }),
    ).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('https://dev.aceaix.com/u/1');
  });

  it('falls back to copy when Web Share rejects the payload', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
      clipboard: { writeText },
    });

    await expect(shareContent({ message: 'Talent Score 85' })).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('Talent Score 85');
  });

  it('treats closing the share sheet as cancellation', async () => {
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')),
    });

    await expect(shareContent({ message: 'Profile' })).resolves.toBe('dismissed');
  });
});
