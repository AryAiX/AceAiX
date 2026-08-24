import { supabase, unwrap, USER_FIELDS } from './_helpers';
import type { AthleteMedia, MatchRecord, AthleteAttribute, AthleteProfile, UserProfile, CareerMilestone } from '../types';

export type PublicHighlight = AthleteMedia & {
  athlete?: AthleteProfile & { user?: UserProfile };
};

// ---- Media ----
export async function listMedia(athleteId: string, opts: { publicOnly?: boolean } = {}): Promise<AthleteMedia[]> {
  let q = supabase.from('athlete_media').select('*').eq('athlete_id', athleteId).order('created_at', { ascending: false });
  if (opts.publicOnly) q = q.eq('is_public', true);
  return unwrap(await q) as AthleteMedia[];
}

// ---- Public highlights (across all athletes) ----
export async function listPublicHighlights(limit = 12): Promise<PublicHighlight[]> {
  const q = supabase
    .from('athlete_media')
    .select(`*, athlete:athlete_profiles(*, user:user_profiles(${USER_FIELDS}))`)
    .eq('is_public', true)
    .order('views_count', { ascending: false })
    .limit(limit);
  return unwrap(await q) as PublicHighlight[];
}

export async function createMedia(input: Partial<AthleteMedia> & { athlete_id: string; title: string; storage_url: string }): Promise<AthleteMedia> {
  return unwrap(await supabase.from('athlete_media').insert(input).select('*').single()) as AthleteMedia;
}

export async function deleteMedia(id: string): Promise<void> {
  unwrap(await supabase.from('athlete_media').delete().eq('id', id).select('id'));
}

export async function updateMedia(id: string, patch: Partial<AthleteMedia>): Promise<AthleteMedia> {
  return unwrap(await supabase.from('athlete_media').update(patch).eq('id', id).select('*').single()) as AthleteMedia;
}

export async function toggleMediaLike(mediaId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_media_like', { p_media_id: mediaId });
  if (error) throw new Error(error.message);
  return data as boolean;
}

export async function listMyMediaLikes(mediaIds: string[], userId: string): Promise<string[]> {
  if (!mediaIds.length) return [];
  const rows = unwrap(
    await supabase.from('media_likes').select('media_id').eq('user_id', userId).in('media_id', mediaIds),
  ) as { media_id: string }[];
  return rows.map(r => r.media_id);
}

// ---- Matches ----
export async function listMatches(athleteId: string, limit?: number): Promise<MatchRecord[]> {
  let q = supabase.from('match_records').select('*').eq('athlete_id', athleteId).order('match_date', { ascending: false });
  if (limit) q = q.limit(limit);
  return unwrap(await q) as MatchRecord[];
}

export async function createMatch(input: Partial<MatchRecord> & { athlete_id: string; match_date: string }): Promise<MatchRecord> {
  return unwrap(await supabase.from('match_records').insert(input).select('*').single()) as MatchRecord;
}

export async function updateMatch(id: string, patch: Partial<MatchRecord>): Promise<MatchRecord> {
  return unwrap(await supabase.from('match_records').update(patch).eq('id', id).select('*').single()) as MatchRecord;
}

export async function deleteMatch(id: string): Promise<void> {
  unwrap(await supabase.from('match_records').delete().eq('id', id).select('id'));
}

// ---- Attributes (normalized) ----
export async function listAttributes(athleteId: string): Promise<AthleteAttribute[]> {
  return unwrap(
    await supabase.from('athlete_attributes').select('*').eq('athlete_id', athleteId).order('recorded_at', { ascending: false }),
  ) as AthleteAttribute[];
}

// ---- Career milestones ----
export async function listCareerMilestones(athleteId: string): Promise<CareerMilestone[]> {
  return unwrap(
    await supabase.from('career_milestones').select('*').eq('athlete_id', athleteId).order('achieved_at', { ascending: false }),
  ) as CareerMilestone[];
}
