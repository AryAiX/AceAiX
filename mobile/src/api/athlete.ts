import { supabase, unwrap, USER_FIELDS } from '../lib/supabase';
import type {
  AthleteMedia,
  AthleteProfile,
  MatchRecord,
  MedicalClearance,
  Opportunity,
  UserProfile,
} from '../types';

export type AthleteWithUser = AthleteProfile & { user?: UserProfile };

const ATHLETE_SELECT = `*, user:user_profiles(${USER_FIELDS})`;
const OPPORTUNITY_SELECT = '*, organization:organizations(id,name,short_name,logo_url,league,country,city,is_verified)';

export async function getAthleteByUserId(userId: string): Promise<AthleteWithUser | null> {
  return unwrap(
    await supabase.from('athlete_profiles').select(ATHLETE_SELECT).eq('user_id', userId).maybeSingle(),
  ) as AthleteWithUser | null;
}

export async function updateAthlete(id: string, patch: Partial<AthleteProfile>): Promise<AthleteProfile> {
  return unwrap(await supabase.from('athlete_profiles').update(patch).eq('id', id).select('*').single()) as AthleteProfile;
}

export async function updateUserProfile(id: string, patch: Partial<UserProfile>): Promise<UserProfile> {
  return unwrap(await supabase.from('user_profiles').update(patch).eq('id', id).select('*').single()) as UserProfile;
}

export async function listMedia(athleteId: string): Promise<AthleteMedia[]> {
  return unwrap(
    await supabase.from('athlete_media').select('*').eq('athlete_id', athleteId).order('created_at', { ascending: false }),
  ) as AthleteMedia[];
}

export async function createMedia(input: {
  athlete_id: string;
  title: string;
  storage_url: string;
  thumbnail_url?: string | null;
  media_type?: AthleteMedia['media_type'];
  description?: string | null;
}): Promise<AthleteMedia> {
  return unwrap(
    await supabase
      .from('athlete_media')
      .insert({
        media_type: 'video',
        description: null,
        thumbnail_url: null,
        is_featured: false,
        is_public: true,
        ...input,
      })
      .select('*')
      .single(),
  ) as AthleteMedia;
}

export async function listMatches(athleteId: string, limit?: number): Promise<MatchRecord[]> {
  let query = supabase.from('match_records').select('*').eq('athlete_id', athleteId).order('match_date', { ascending: false });
  if (limit) query = query.limit(limit);
  return unwrap(await query) as MatchRecord[];
}

export async function createMatch(input: {
  athlete_id: string;
  match_date: string;
  opponent?: string | null;
  competition?: string | null;
  result?: string | null;
  minutes_played?: number | null;
  goals?: number;
  assists?: number;
  notes?: string | null;
}): Promise<MatchRecord> {
  return unwrap(
    await supabase
      .from('match_records')
      .insert({
        goals: 0,
        assists: 0,
        source: 'self',
        stats: {},
        ...input,
      })
      .select('*')
      .single(),
  ) as MatchRecord;
}

export async function listOpportunities(filters: { sport?: string | null; limit?: number } = {}): Promise<Opportunity[]> {
  let query = supabase.from('opportunities').select(OPPORTUNITY_SELECT).eq('is_active', true).order('created_at', { ascending: false });
  if (filters.sport) query = query.eq('sport', filters.sport);
  if (filters.limit) query = query.limit(filters.limit);
  return unwrap(await query) as Opportunity[];
}

export async function profileViewCount(athleteId: string): Promise<number> {
  const { count, error } = await supabase
    .from('profile_views')
    .select('id', { count: 'exact', head: true })
    .eq('athlete_id', athleteId);
  if (error) throw error;
  return count ?? 0;
}

export async function latestClearance(athleteId: string): Promise<MedicalClearance | null> {
  return unwrap(
    await supabase
      .from('medical_clearances')
      .select('id,athlete_id,status,effective_to,notes,created_at')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ) as MedicalClearance | null;
}
