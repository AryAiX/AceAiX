import { useCallback, useEffect, useRef } from 'react';

/**
 * setTimeout that is cancelled when the component unmounts, so deferred state
 * updates (transient "Saved!" banners, delayed scrolls) cannot fire on a screen
 * the user has already navigated away from.
 */
export function useTrackedTimeout() {
  const pending = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => {
    pending.current.forEach(clearTimeout);
    pending.current = [];
  }, []);

  return useCallback((callback: () => void, delay: number) => {
    const id = setTimeout(() => {
      pending.current = pending.current.filter(pendingId => pendingId !== id);
      callback();
    }, delay);
    pending.current.push(id);
    return id;
  }, []);
}
