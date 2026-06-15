import { supabase, unwrap, USER_FIELDS } from './_helpers';
import type { Follow, Endorsement, Recommendation, UserProfile } from '../types';

// ---- Follows ----
export async function listFollowing(userId: string): Promise<Follow[]> {
  return unwrap(
    await supabase.from('follows').select(`*, following:user_profiles!follows_following_id_fkey(${USER_FIELDS})`).eq('follower_id', userId),
  ) as Follow[];
}

export async function listFollowers(userId: string): Promise<Follow[]> {
  return unwrap(
    await supabase.from('follows').select(`*, follower:user_profiles!follows_follower_id_fkey(${USER_FIELDS})`).eq('following_id', userId),
  ) as Follow[];
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
  let query = supabase.from('user_profiles').select(USER_FIELDS).ilike('full_name', `%${q}%`).limit(limit);
  if (excludeId) query = query.neq('id', excludeId);
  return unwrap(await query) as UserProfile[];
}

/** Scouts & clubs to follow/discover. */
export async function listScouts(limit = 6): Promise<UserProfile[]> {
  return unwrap(
    await supabase
      .from('user_profiles')
      .select(USER_FIELDS)
      .in('role', ['scout', 'club'])
      .order('created_at', { ascending: false })
      .limit(limit),
  ) as UserProfile[];
}
