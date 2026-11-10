import { describe, expect, it } from 'vitest';

import { scoreWhenPosted } from '@/lib/scoreTimeline';

describe('your score at the moment you posted', () => {
  it('is the score saved on this phone when you posted', () => {
    expect(scoreWhenPosted(14)).toBe(14);
  });

  it('is unknown otherwise, never a guess', () => {
    expect(scoreWhenPosted(undefined)).toBeNull();
    expect(scoreWhenPosted(null)).toBeNull();
    expect(scoreWhenPosted(0)).toBeNull();
  });
});
