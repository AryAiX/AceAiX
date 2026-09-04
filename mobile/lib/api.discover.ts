import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import { discoverAthletes, searchPeople, talentLeaderboard } from '@/lib/api';
import type { DiscoveryFilters, PersonResult, Tier } from '@/types/models';

/**
 * Discovery-only calls that lib/api.ts does not cover.
 *
 * Everything here is either a shortlist write, a follow lookup the list rows
 * need in one round trip instead of N, or a typed wrapper over an RPC that
 * lib/api.ts returns loosely.
 */

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new AppError('Not signed in');
  return data.user.id;
}

// ── Result count ─────────────────────────────────────────────────────────────
/**
 * How many athletes a filter set would return.
 *
 * `discover_athletes` puts `total_count` on every row, so one row is enough —
 * this is what keeps the sheet's "Show N results" button honest without a
 * second counting query.
 */
export async function countDiscoverAthletes(filters: DiscoveryFilters): Promise<number> {
  const rows = await discoverAthletes(filters, 0, 1);
  return rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
}

// ── Shortlist (watchlists / watchlist_athletes) ───────────────────────────────
const SHORTLIST_NAME = 'Shortlist';

async function myWatchlistIds(): Promise<string[]> {
  const uid = await requireUserId();
  const { data, error } = await supabase.from('watchlists').select('id').eq('user_id', uid);
  if (error) throw new AppError(error);
  return (data ?? []).map((row) => row.id as string);
}

/** Athlete-profile ids the viewer has saved to any of their lists. */
export async function shortlistedAthleteIds(): Promise<string[]> {
  const listIds = await myWatchlistIds();
  if (listIds.length === 0) return [];

  const { data, error } = await supabase
    .from('watchlist_athletes')
    .select('athlete_id')
    .in('watchlist_id', listIds);
  if (error) throw new AppError(error);
  return (data ?? []).map((row) => row.athlete_id as string);
}

/** The default "Shortlist" list, created the first time someone saves. */
async function ensureShortlist(): Promise<string> {
  const uid = await requireUserId();

  const { data: existing, error } = await supabase
    .from('watchlists')
    .select('id')
    .eq('user_id', uid)
    .eq('name', SHORTLIST_NAME)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new AppError(error);
  if (existing) return existing.id as string;

  const { data, error: insertError } = await supabase
    .from('watchlists')
    .insert({
      user_id: uid,
      name: SHORTLIST_NAME,
      description: 'Athletes you want to come back to.',
    })
    .select('id')
    .single();
  if (insertError) throw new AppError(insertError);
  return data.id as string;
}

export async function addToShortlist(athleteId: string): Promise<void> {
  const listId = await ensureShortlist();
  const { error } = await supabase
    .from('watchlist_athletes')
    .insert({ watchlist_id: listId, athlete_id: athleteId });

  // 23505: already on the list. The athlete is saved either way, so a double
  // tap from a stale card must not surface as a failure.
  if (error && (error as { code?: string }).code !== '23505') throw new AppError(error);
}

export async function removeFromShortlist(athleteId: string): Promise<void> {
  const listIds = await myWatchlistIds();
  if (listIds.length === 0) return;

  const { error } = await supabase
    .from('watchlist_athletes')
    .delete()
    .eq('athlete_id', athleteId)
    .in('watchlist_id', listIds);
  if (error) throw new AppError(error);
}

// ── Follow state ─────────────────────────────────────────────────────────────
/** People the viewer follows — one query for a whole list of rows. */
export async function followedUserIds(): Promise<string[]> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', uid)
    .limit(500);
  if (error) throw new AppError(error);
  return (data ?? []).map((row) => row.following_id as string);
}

export async function followedOrganizationIds(): Promise<string[]> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from('organization_follows')
    .select('organization_id')
    .eq('follower_id', uid)
    .limit(500);
  if (error) throw new AppError(error);
  return (data ?? []).map((row) => row.organization_id as string);
}

/** Follow or unfollow a club. Returns the state the viewer ends up in. */
export async function toggleOrganizationFollow(
  organizationId: string,
  following: boolean,
): Promise<boolean> {
  const uid = await requireUserId();

  if (following) {
    const { error } = await supabase
      .from('organization_follows')
      .delete()
      .eq('follower_id', uid)
      .eq('organization_id', organizationId);
    if (error) throw new AppError(error);
    return false;
  }

  const { error } = await supabase
    .from('organization_follows')
    .insert({ follower_id: uid, organization_id: organizationId });
  if (error && (error as { code?: string }).code !== '23505') throw new AppError(error);
  return true;
}

// ── Coaches ──────────────────────────────────────────────────────────────────
/**
 * Coaches, browsable with or without a search term.
 *
 * The role filter runs in the database rather than on the client: filtering a
 * 20-row page of mixed roles down to coaches is what makes a search look empty
 * when it is not.
 */
export async function listCoaches(query: string, limit = 24): Promise<PersonResult[]> {
  const term = query.trim();

  // With a term, go through search_people so the same discovery rules apply
  // everywhere a person can be named. Without one this is a browse, not a
  // search, so it lists verified coaches by reach.
  if (term) return searchPeople(term, 'coach', limit);

  const { data, error } = await supabase
    .from('user_profiles')
    .select(
      'id, role, full_name, avatar_url, bio, city, country, is_verified, is_minor, followers_count',
    )
    .eq('role', 'coach')
    .eq('is_suspended', false)
    .order('is_verified', { ascending: false })
    .order('followers_count', { ascending: false })
    .limit(limit);

  if (error) throw new AppError(error);
  return (data ?? []).map((row) => ({
    ...(row as Omit<PersonResult, 'sport' | 'position' | 'talent_score' | 'tier' | 'is_following'>),
    sport: null,
    position: null,
    talent_score: 0,
    tier: 'rising' as const,
    is_following: false,
  }));
}


// ── Leaderboard ──────────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  athlete_id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  sport: string | null;
  position: string | null;
  country: string | null;
  overall: number;
  tier: Tier;
  rank: number;
}

export async function leaderboard(
  sport?: string,
  country?: string,
  limit = 25,
): Promise<LeaderboardEntry[]> {
  const rows = await talentLeaderboard(sport, country, limit);
  return (rows ?? []) as LeaderboardEntry[];
}
