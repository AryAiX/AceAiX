import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
}));

import { screenFromConsentGet, screenFromConsentPost } from '@/lib/parentApproval';

const pendingBody = {
  state: 'pending',
  child_name: 'Mina',
  options: {
    allow_discovery: true,
    allow_messaging: false,
    allow_media: true,
    allow_assessments: false,
    allow_sponsorship: true,
    allow_bookings: false,
    allow_mindset: false,
  },
};

describe('screenFromConsentGet', () => {
  it('treats a missing or unknown token as an invalid link', () => {
    expect(screenFromConsentGet(400, { state: 'invalid', child_name: null, options: null })).toEqual({
      screen: 'invalid',
    });
    expect(screenFromConsentGet(404, { state: 'invalid', child_name: null, options: null })).toEqual({
      screen: 'invalid',
    });
  });

  it('treats 410 as expired', () => {
    expect(screenFromConsentGet(410, { state: 'expired', child_name: null, options: null })).toEqual({
      screen: 'expired',
    });
  });

  it('follows the 200 state', () => {
    expect(screenFromConsentGet(200, { state: 'answered', child_name: null, options: null })).toEqual({
      screen: 'answered',
    });
    expect(screenFromConsentGet(200, { state: 'expired', child_name: null, options: null })).toEqual({
      screen: 'expired',
    });
    expect(screenFromConsentGet(200, { state: 'invalid', child_name: null, options: null })).toEqual({
      screen: 'invalid',
    });
  });

  it('keeps the child name and only the boxes the response ticked', () => {
    expect(screenFromConsentGet(200, pendingBody)).toEqual({
      screen: 'pending',
      childName: 'Mina',
      options: pendingBody.options,
    });
  });

  it('uses no name and no ticks when those fields are null', () => {
    expect(
      screenFromConsentGet(200, { state: 'pending', child_name: null, options: null }),
    ).toEqual({
      screen: 'pending',
      childName: null,
      options: {
        allow_discovery: false,
        allow_messaging: false,
        allow_media: false,
        allow_assessments: false,
        allow_sponsorship: false,
        allow_bookings: false,
        allow_mindset: false,
      },
    });
  });

  it('ignores a non-true option, including the form string "1"', () => {
    expect(
      screenFromConsentGet(200, {
        state: 'pending',
        child_name: '  ',
        options: { allow_discovery: '1', allow_messaging: 1, allow_media: true },
      }),
    ).toEqual({
      screen: 'pending',
      childName: null,
      options: {
        allow_discovery: false,
        allow_messaging: false,
        allow_media: true,
        allow_assessments: false,
        allow_sponsorship: false,
        allow_bookings: false,
        allow_mindset: false,
      },
    });
  });

  it('turns any other status into a retryable error', () => {
    expect(screenFromConsentGet(500, { state: 'pending' })).toEqual({ screen: 'error' });
    expect(screenFromConsentGet(200, null)).toEqual({ screen: 'error' });
  });
});

describe('screenFromConsentPost', () => {
  it('shows approved and declined from the success states', () => {
    expect(screenFromConsentPost(200, { ok: true, state: 'granted' })).toEqual({ screen: 'approved' });
    expect(screenFromConsentPost(200, { ok: true, state: 'revoked' })).toEqual({ screen: 'declined' });
  });

  it('shows expired or invalid when the token can no longer be used', () => {
    expect(screenFromConsentPost(400, { ok: false, state: 'expired' })).toEqual({ screen: 'expired' });
    expect(screenFromConsentPost(400, { ok: false, state: 'invalid' })).toEqual({ screen: 'invalid' });
  });

  it('keeps a failed write on the retry screen, even when state is invalid', () => {
    expect(screenFromConsentPost(500, { ok: false, state: 'invalid' })).toEqual({ screen: 'error' });
  });
});
