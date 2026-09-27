import { useCallback, useSyncExternalStore } from 'react';

/* One mute setting shared by every feed video for the whole app session.
   Starts muted on each launch; not persisted. */
let muted = true;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return muted;
}

export function setFeedMuted(next: boolean) {
  if (next === muted) return;
  muted = next;
  listeners.forEach((listener) => listener());
}

export function useFeedMute(): [boolean, () => void] {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const toggle = useCallback(() => setFeedMuted(!muted), []);
  return [value, toggle];
}
