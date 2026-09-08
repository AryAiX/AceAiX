const FRIENDLY_CODES: Record<string, string> = {
  provider_unconfigured:
    'Live football sync is not configured yet. You can add stats manually in the meantime.',
  provider_rate_limited:
    'The data provider limit has been reached. Try again later.',
  provider_unavailable:
    'The data provider is temporarily unavailable. Try again later.',
  username_not_found:
    'No public chess profile was found for the saved username.',
  player_not_found:
    'No football player was found for the linked ID and season.',
  statistics_not_found:
    'No statistics are available for the linked player and season.',
};

export async function edgeFunctionErrorMessage(
  error: unknown,
  fallback = 'Sync failed. Try again later.',
): Promise<string> {
  const candidate = error as {
    message?: unknown;
    context?: { clone?: () => Response; json?: () => Promise<unknown> };
  } | null;
  const context = candidate?.context;

  if (context?.json) {
    try {
      const response = (context.clone ? context.clone() : context) as {
        json: () => Promise<unknown>;
      };
      const payload = (await response.json()) as {
        error?: unknown;
        code?: unknown;
      };
      if (typeof payload.error === 'string' && payload.error.trim())
        return payload.error;
      if (typeof payload.code === 'string' && FRIENDLY_CODES[payload.code]) {
        return FRIENDLY_CODES[payload.code];
      }
    } catch {
      // Fall through to the SDK message when the body is not JSON.
    }
  }

  const message =
    typeof candidate?.message === 'string' ? candidate.message.trim() : '';
  return message && !/non-2xx status code/i.test(message) ? message : fallback;
}
