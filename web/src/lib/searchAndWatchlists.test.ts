import { describe, expect, it } from 'vitest';
import type { Watchlist } from '../types';
import { athleteMatchesSearch, athleteSearchTerms } from './athleteSearch';
import {
  findAthleteWatchlistRows,
  findDefaultWatchlist,
  findDefaultWatchlistAthleteRow,
  normalizeWatchlistName,
  watchlistMutationErrorMessage,
} from './watchlistState';
import { withoutSearchParam } from './searchParams';

describe('athlete natural-language search', () => {
  it('matches useful terms across separate profile fields', () => {
    const profileText = 'Maya Noor Basketball Point Guard Dubai professional';
    expect(athleteMatchesSearch(profileText, 'find a basketball point guard in Dubai')).toBe(true);
  });

  it('ignores age syntax handled by structured filters', () => {
    expect(athleteSearchTerms('verified striker under 23 from UAE')).toEqual([
      'verified', 'striker', 'uae',
    ]);
  });
});

describe('multi-watchlist state', () => {
  it('uses the same case-insensitive trimmed name as the database uniqueness key', () => {
    expect(normalizeWatchlistName('  Saved Prospects  ')).toBe('saved prospects');
    expect(findDefaultWatchlist([
      { id: 'default', name: '  SAVED PROSPECTS  ', athletes: [] },
    ] as unknown as Watchlist[])?.id).toBe('default');
  });

  it('returns every row containing an athlete', () => {
    const watchlists = [
      { name: 'Regional prospects', athletes: [{ id: 'row-1', athlete_id: 'athlete-1' }] },
      { name: 'Saved prospects', athletes: [{ id: 'row-2', athlete_id: 'athlete-1' }, { id: 'row-3', athlete_id: 'athlete-2' }] },
    ] as Watchlist[];

    expect(findAthleteWatchlistRows(watchlists, 'athlete-1')).toEqual(['row-1', 'row-2']);
  });

  it('targets only the default-list row when an athlete is in multiple lists', () => {
    const watchlists = [
      { id: 'named', name: 'Summer shortlist', athletes: [{ id: 'named-row', athlete_id: 'athlete-1' }] },
      { id: 'default', name: 'Saved Prospects', athletes: [{ id: 'default-row', athlete_id: 'athlete-1' }] },
    ] as Watchlist[];

    expect(findDefaultWatchlist(watchlists)?.id).toBe('default');
    expect(findDefaultWatchlistAthleteRow(watchlists, 'athlete-1')).toBe('default-row');
  });

  it('does not treat named-list membership as default-list membership', () => {
    const watchlists = [
      { id: 'named', name: 'Goalkeepers', athletes: [{ id: 'named-row', athlete_id: 'athlete-1' }] },
    ] as Watchlist[];

    expect(findDefaultWatchlistAthleteRow(watchlists, 'athlete-1')).toBeUndefined();
  });

  it('turns normalized-name uniqueness failures into actionable copy', () => {
    expect(watchlistMutationErrorMessage(
      new Error('duplicate key value violates unique constraint "watchlists_user_normalized_name_uidx"'),
    )).toBe('A watchlist with this name already exists. Choose a different name.');
    expect(watchlistMutationErrorMessage(new Error('network unavailable')))
      .toBe('network unavailable');
  });
});

describe('consumed deep-link search parameters', () => {
  it('removes only the handled user target', () => {
    const next = withoutSearchParam(
      new URLSearchParams('user=target-1&draft=hello'),
      'user',
    );

    expect(next.get('user')).toBeNull();
    expect(next.get('draft')).toBe('hello');
  });
});
