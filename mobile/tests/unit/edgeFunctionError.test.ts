import { describe, expect, it } from 'vitest';
import { edgeFunctionErrorMessage } from '../../lib/edgeFunctionError';

describe('edgeFunctionErrorMessage', () => {
  it('returns the structured Edge Function error instead of the generic non-2xx message', async () => {
    const response = new Response(
      JSON.stringify({
        code: 'provider_unconfigured',
        error: 'Live football sync is not configured yet.',
      }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );

    await expect(
      edgeFunctionErrorMessage({
        message: 'Edge Function returned a non-2xx status code',
        context: response,
      }),
    ).resolves.toBe('Live football sync is not configured yet.');
  });

  it('uses a stable fallback when the response body is unavailable', async () => {
    await expect(
      edgeFunctionErrorMessage(
        { message: 'Edge Function returned a non-2xx status code' },
        'Chess sync failed.',
      ),
    ).resolves.toBe('Chess sync failed.');
  });

  it('preserves useful network errors', async () => {
    await expect(
      edgeFunctionErrorMessage({ message: 'Failed to fetch' }),
    ).resolves.toBe('Failed to fetch');
  });
});
