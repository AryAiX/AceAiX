import { supabase, unwrap, USER_FIELDS } from './_helpers';
import type { Watchlist } from '../types';
import { normalizeWatchlistName } from '../lib/watchlistState';

const SELECT = `*, athletes:watchlist_athletes(*, athlete:athlete_profiles(*, user:user_profiles(${USER_FIELDS})))`;

export async function listWatchlists(userId: string): Promise<Watchlist[]> {
  return unwrap(
    await supabase
      .from('watchlists')
      .select(SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ) as Watchlist[];
}

export async function createWatchlist(
  userId: string,
  name: string,
  description?: string,
): Promise<Watchlist> {
  return unwrap(
    await supabase
      .from('watchlists')
      .insert({ user_id: userId, name, description })
      .select('*')
      .single(),
  ) as Watchlist;
}

export async function getOrCreateWatchlist(
  userId: string,
  name: string,
  description?: string,
): Promise<Watchlist> {
  const inserted = unwrap(
    await supabase
      .from('watchlists')
      .upsert(
        { user_id: userId, name, description },
        { onConflict: 'user_id,name_normalized', ignoreDuplicates: true },
      )
      .select('*')
      .maybeSingle(),
  ) as Watchlist | null;
  if (inserted) return inserted;

  return unwrap(
    await supabase
      .from('watchlists')
      .select('*')
      .eq('user_id', userId)
      .eq('name_normalized', normalizeWatchlistName(name))
      .single(),
  ) as Watchlist;
}

export async function renameWatchlist(id: string, name: string): Promise<void> {
  unwrap(
    await supabase
      .from('watchlists')
      .update({ name })
      .eq('id', id)
      .select('id'),
  );
}

export async function deleteWatchlist(id: string): Promise<void> {
  unwrap(await supabase.from('watchlists').delete().eq('id', id).select('id'));
}

export async function addAthleteToWatchlist(
  watchlistId: string,
  athleteId: string,
  notes?: string,
): Promise<void> {
  unwrap(
    await supabase
      .from('watchlist_athletes')
      .upsert(
        { watchlist_id: watchlistId, athlete_id: athleteId, notes },
        { onConflict: 'watchlist_id,athlete_id', ignoreDuplicates: true },
      )
      .select('id'),
  );
}

export async function removeAthleteFromWatchlist(id: string): Promise<void> {
  unwrap(
    await supabase
      .from('watchlist_athletes')
      .delete()
      .eq('id', id)
      .select('id'),
  );
}
