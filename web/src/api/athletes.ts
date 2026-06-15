import { supabase, unwrap, USER_FIELDS } from './_helpers';
import type { AthleteProfile, UserProfile } from '../types';

export type AthleteWithUser = AthleteProfile & { user?: UserProfile };

export interface AthleteFilters {
  sport?: string;
  level?: string;
  q?: string;
  openToOffers?: boolean;
  minScore?: number;
  limit?: number;
}

const SELECT = `*, user:user_profiles(${USER_FIELDS})`;

export async function listAthletes(filters: AthleteFilters = {}): Promise<AthleteWithUser[]> {
  let query = supabase.from('athlete_profiles').select(SELECT).order('visibility_score', { ascending: false });
  if (filters.sport && filters.sport !== 'All') query = query.eq('sport', filters.sport);
  if (filters.level) query = query.eq('level', filters.level);
  if (filters.openToOffers) query = query.eq('is_open_to_offers', true);
  if (filters.minScore) query = query.gte('visibility_score', filters.minScore);
  if (filters.limit) query = query.limit(filters.limit);
  const data = unwrap(await query);
  let rows = data as AthleteWithUser[];
  if (filters.q) {
    const q = filters.q.toLowerCase();
    rows = rows.filter(
      (a) =>
        a.user?.full_name?.toLowerCase().includes(q) ||
        a.sport?.toLowerCase().includes(q) ||
        a.position?.toLowerCase().includes(q) ||
        a.position_primary?.toLowerCase().includes(q) ||
        a.current_club?.toLowerCase().includes(q),
    );
  }
  return rows;
}

export async function getAthleteById(id: string): Promise<AthleteWithUser | null> {
  const data = unwrap(await supabase.from('athlete_profiles').select(SELECT).eq('id', id).maybeSingle());
  return data as AthleteWithUser | null;
}

export async function getAthleteByUserId(userId: string): Promise<AthleteWithUser | null> {
  const data = unwrap(await supabase.from('athlete_profiles').select(SELECT).eq('user_id', userId).maybeSingle());
  return data as AthleteWithUser | null;
}

export async function updateAthlete(id: string, patch: Partial<AthleteProfile>): Promise<AthleteProfile> {
  return unwrap<AthleteProfile>(await supabase.from('athlete_profiles').update(patch).eq('id', id).select('*').single());
}
