import { useEffect, useRef } from 'react';

/**
 * The latest view count this session has learned for a post or a highlight.
 *
 * A watch records on the server while another screen still holds the old
 * number. Lists subscribe here instead of each inventing a refresh. Counts
 * only rise, so a slower read that finishes late cannot walk a number back.
 */

export type ViewSubject = 'post' | 'highlight';

type Listener = (subject: ViewSubject, id: string, count: number) => void;

const listeners = new Set<Listener>();
const latest = new Map<string, number>();

function key(subject: ViewSubject, id: string): string {
  return `${subject}:${id}`;
}

/** The count last published for this clip, if this session has learned one. */
export function knownViewCount(subject: ViewSubject, id: string): number | undefined {
  return latest.get(key(subject, id));
}

export function publishViewCount(subject: ViewSubject, id: string, count: number): void {
  if (!id || !Number.isFinite(count)) return;
  const slot = key(subject, id);
  const prev = latest.get(slot);
  if (prev != null && count <= prev) return;
  latest.set(slot, count);
  for (const listener of listeners) listener(subject, id, count);
}

export function subscribeViewCounts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Re-render the subscriber when any count moves. The callback sees every update. */
export function useViewCountUpdates(
  onCount: (subject: ViewSubject, id: string, count: number) => void,
): void {
  const onCountRef = useRef(onCount);
  onCountRef.current = onCount;
  useEffect(() => subscribeViewCounts((subject, id, count) => onCountRef.current(subject, id, count)), []);
}
