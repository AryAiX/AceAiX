import type { Watchlist } from '../types';

export const DEFAULT_WATCHLIST_NAME = 'Saved prospects';

export function normalizeWatchlistName(name: string): string {
  return name.trim().toLowerCase();
}

export function watchlistMutationErrorMessage(
  error: unknown,
  fallback = 'Watchlist could not be updated.',
): string {
  const message = error instanceof Error ? error.message : '';
  const normalized = message.toLowerCase();
  if (
    normalized.includes('watchlists_user_normalized_name_uidx')
    || normalized.includes('duplicate key')
    || normalized.includes('unique constraint')
  ) {
    return 'A watchlist with this name already exists. Choose a different name.';
  }
  return message || fallback;
}

export function findAthleteWatchlistRows(watchlists: Watchlist[], athleteId: string): string[] {
  return watchlists.flatMap((watchlist) =>
    (watchlist.athletes ?? [])
      .filter((row) => row.athlete_id === athleteId)
      .map((row) => row.id),
  );
}

export function findDefaultWatchlist(watchlists: Watchlist[]): Watchlist | undefined {
  return watchlists.find(
    (watchlist) => normalizeWatchlistName(watchlist.name) === normalizeWatchlistName(DEFAULT_WATCHLIST_NAME),
  );
}

export function findDefaultWatchlistAthleteRow(
  watchlists: Watchlist[],
  athleteId: string,
): string | undefined {
  return findDefaultWatchlist(watchlists)?.athletes?.find(
    (row) => row.athlete_id === athleteId,
  )?.id;
}
