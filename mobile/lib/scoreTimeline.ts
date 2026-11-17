/**
 * Your score at the moment a post went up, only when it is known exactly:
 * the score this phone saved when you posted it (see scoreSnapshots).
 *
 * Score history is not used here. It keeps one score per day and overwrites
 * it on every change, so a post made between two changes on the same day has
 * no record of its score anywhere; a number worked out from it would be a
 * guess, and a wrong one shown as fact is worse than none.
 */
export function scoreWhenPosted(saved: number | null | undefined): number | null {
  return typeof saved === 'number' && saved > 0 ? saved : null;
}
