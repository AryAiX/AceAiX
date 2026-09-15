import { supabase, unwrap, USER_FIELDS } from './_helpers';
import type { Follow, Endorsement, Recommendation, UserProfile } from '../types';
import { isUserProfile } from '../lib/userProfile';

// ---- Follows ----
export async function listFollowing(userId: string): Promise<Follow[]> {
  const rows = unwrap(
    await supabase.from('follows').select(`*, following:user_profiles!follows_following_id_fkey(${USER_FIELDS})`).eq('follower_id', userId),
  ) as Array<Follow & { following?: UserProfile | null }>;
  return rows.filter((row) => isUserProfile(row.following));
}

export async function listFollowers(userId: string): Promise<Follow[]> {
  const rows = unwrap(
    await supabase.from('follows').select(`*, follower:user_profiles!follows_follower_id_fkey(${USER_FIELDS})`).eq('following_id', userId),
  ) as Array<Follow & { follower?: UserProfile | null }>;
  return rows.filter((row) => isUserProfile(row.follower));
}

export async function followCount(userId: string): Promise<{ followers: number; following: number }> {
  const followers = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId);
  const following = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId);
  return { followers: followers.count ?? 0, following: following.count ?? 0 };
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const data = unwrap(await supabase.from('follows').select('id').eq('follower_id', followerId).eq('following_id', followingId).maybeSingle());
  return !!data;
}

export async function follow(followerId: string, followingId: string): Promise<void> {
  unwrap(await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId }).select('id'));
}

export async function unfollow(followerId: string, followingId: string): Promise<void> {
  unwrap(await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId).select('id'));
}

// ---- Endorsements ----
export async function listEndorsements(athleteId: string): Promise<Endorsement[]> {
  return unwrap(
    await supabase.from('endorsements').select(`*, endorser:user_profiles(${USER_FIELDS})`).eq('athlete_id', athleteId).order('created_at', { ascending: false }),
  ) as Endorsement[];
}

// ---- Recommendations ----
export async function listRecommendations(recipientId: string): Promise<Recommendation[]> {
  return unwrap(
    await supabase.from('recommendations').select(`*, author:user_profiles!recommendations_author_id_fkey(${USER_FIELDS})`).eq('recipient_id', recipientId).order('created_at', { ascending: false }),
  ) as Recommendation[];
}

export async function upsertRecommendation(input: { author_id: string; recipient_id: string; relationship_type: string; body: string; is_public?: boolean }): Promise<Recommendation> {
  return unwrap(
    await supabase.from('recommendations').upsert(input, { onConflict: 'author_id,recipient_id' }).select('*').single(),
  ) as Recommendation;
}

export async function deleteRecommendation(id: string): Promise<void> {
  unwrap(await supabase.from('recommendations').delete().eq('id', id).select('id'));
}

export async function searchUsers(q: string, excludeId?: string, limit = 8): Promise<UserProfile[]> {
  const query = q.trim();
  const requestedLimit = Math.max(0, Math.min(Math.floor(limit), 50));
  if (!query || requestedLimit === 0) return [];

  const rows = unwrap(
    await supabase.rpc('search_people', {
      p_query: query,
      p_role: null,
      p_limit: Math.min(requestedLimit + (excludeId ? 1 : 0), 50),
    }),
  ) as unknown;
  if (!Array.isArray(rows)) return [];

  const validRoles = new Set<UserProfile['role']>([
    'athlete', 'scout', 'club', 'coach', 'medical_partner', 'federation',
    'guardian', 'org_admin', 'admin', 'super_admin', 'guest',
  ]);

  return rows
    .filter((row): row is Record<string, unknown> => (
      !!row
      && typeof row === 'object'
      && typeof (row as Record<string, unknown>).id === 'string'
      && validRoles.has((row as Record<string, unknown>).role as UserProfile['role'])
    ))
    .filter((row) => !excludeId || row.id !== excludeId)
    .slice(0, requestedLimit)
    .map((row) => ({
      id: row.id as string,
      role: row.role as UserProfile['role'],
      full_name: typeof row.full_name === 'string' ? row.full_name : null,
      avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
      bio: typeof row.bio === 'string' ? row.bio : null,
      city: typeof row.city === 'string' ? row.city : null,
      country: typeof row.country === 'string' ? row.country : null,
      locale: null,
      is_verified: row.is_verified === true,
      subscription_tier: 'free',
      created_at: '',
      updated_at: '',
    }));
}

/** Verified recruiting roles to follow/discover. */
export async function listScouts(limit = 6): Promise<UserProfile[]> {
  return unwrap(
    await supabase
      .from('user_profiles')
      .select(USER_FIELDS)
      .in('role', ['coach', 'scout', 'club'])
      .order('created_at', { ascending: false })
      .limit(limit),
  ) as UserProfile[];
}
