import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { errorMessage } from '@/lib/errors';

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
}

interface Options {
  /** Skip the initial fetch (e.g. waiting on an id). */
  enabled?: boolean;
  /** Re-fetch every time the screen regains focus. */
  refetchOnFocus?: boolean;
}

/**
 * The one data-fetching primitive used by every screen.
 *
 * It guarantees three things the old screens got wrong: a request that resolves
 * after unmount never sets state, a failure always produces a message the UI
 * can render, and pull-to-refresh never shows the full-screen loader again.
 */
export function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
  options: Options = {},
) {
  const { enabled = true, refetchOnFocus = false } = options;

  const [state, setState] = useState<State<T>>({
    data: null,
    error: null,
    loading: enabled,
    refreshing: false,
  });

  const mounted = useRef(true);
  const runId = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!enabled) return;
      const id = ++runId.current;

      setState((s) => ({
        ...s,
        loading: mode === 'initial' ? s.data === null : false,
        refreshing: mode === 'refresh',
        error: null,
      }));

      try {
        const data = await fetcher();
        // A slower earlier request must never overwrite a newer result.
        if (!mounted.current || id !== runId.current) return;
        setState({ data, error: null, loading: false, refreshing: false });
      } catch (err) {
        if (!mounted.current || id !== runId.current) return;
        setState((s) => ({
          ...s,
          error: errorMessage(err),
          loading: false,
          refreshing: false,
        }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, ...deps],
  );

  useEffect(() => {
    run('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  useFocusEffect(
    useCallback(() => {
      if (refetchOnFocus) run('refresh');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refetchOnFocus, run]),
  );

  const refresh = useCallback(() => run('refresh'), [run]);

  /** Update the cached value without a round trip (optimistic UI). */
  const mutate = useCallback((updater: (current: T | null) => T | null) => {
    setState((s) => ({ ...s, data: updater(s.data) }));
  }, []);

  return { ...state, refresh, reload: () => run('initial'), mutate };
}

/**
 * A one-shot action with loading and error state — the counterpart to
 * useAsync for buttons that write.
 */
export function useAction<Args extends unknown[], R>(
  action: (...args: Args) => Promise<R>,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (...args: Args): Promise<R | undefined> => {
      setLoading(true);
      setError(null);
      try {
        const result = await action(...args);
        return result;
      } catch (err) {
        if (mounted.current) setError(errorMessage(err));
        return undefined;
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [action],
  );

  return { run, loading, error, clearError: () => setError(null) };
}
