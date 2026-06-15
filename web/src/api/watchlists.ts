import { supabase, unwrap, USER_FIELDS } from './_helpers';
import type { Watchlist } from '../types';

const SELECT = `*, athletes:watchlist_athletes(*, athlete:athlete_profiles(*, user:user_profiles(${USER_FIELDS})))`;

export async function listWatchlists(userId: string): Promise<Watchlist[]> {
  return unwrap(
    await supabase.from('watchlists').select(SELECT).eq('user_id', userId).order('created_at', { ascending: true }),
  ) as Watchlist[];
}

export async function createWatchlist(userId: string, name: string, description?: string): Promise<Watchlist> {
  return unwrap(await supabase.from('watchlists').insert({ user_id: userId, name, description }).select('*').single()) as Watchlist;
}

export async function renameWatchlist(id: string, name: string): Promise<void> {
  unwrap(await supabase.from('watchlists').update({ name }).eq('id', id).select('id'));
}

export async function deleteWatchlist(id: string): Promise<void> {
  unwrap(await supabase.from('watchlists').delete().eq('id', id).select('id'));
}

export async function addAthleteToWatchlist(watchlistId: string, athleteId: string, notes?: string): Promise<void> {
  unwrap(await supabase.from('watchlist_athletes').insert({ watchlist_id: watchlistId, athlete_id: athleteId, notes }).select('id'));
}

export async function removeAthleteFromWatchlist(id: string): Promise<void> {
  unwrap(await supabase.from('watchlist_athletes').delete().eq('id', id).select('id'));
}
