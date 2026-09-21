import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke },
  },
}));

import { translate } from '@/lib/api.translate';

describe('translate', () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it('binds requests to an authorized server source', async () => {
    invoke.mockResolvedValue({
      data: {
        translated: 'Hola',
        detected_lang: 'en',
        provider: 'test',
      },
      error: null,
    });

    await expect(
      translate('Hello there', 'es', { type: 'post', id: 'post-1' }),
    ).resolves.toEqual({
      translated: 'Hola',
      detectedLang: 'en',
      provider: 'test',
    });

    expect(invoke).toHaveBeenCalledWith('translate', {
      body: {
        source_type: 'post',
        source_id: 'post-1',
        target: 'es',
      },
    });
    expect(invoke.mock.calls[0][1].body).not.toHaveProperty('text');
  });
});
