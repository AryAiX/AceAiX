import { supabase, unwrap } from './_helpers';
import { athleteMatchesSearch } from '../lib/athleteSearch';
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

export async function listAthletes(filters: AthleteFilters = {}): Promise<AthleteWithUser[]> {
  const data = unwrap(
    await supabase.rpc('web_athletes', {
      p_id: null,
      p_user_id: null,
      p_limit: 200,
    }),
  );
  let rows = data as AthleteWithUser[];

  if (filters.sport && filters.sport !== 'All') {
    rows = rows.filter((athlete) => athlete.sport === filters.sport);
  }
  if (filters.level) rows = rows.filter((athlete) => athlete.level === filters.level);
  if (filters.openToOffers) rows = rows.filter((athlete) => athlete.is_open_to_offers);
  const minScore = filters.minScore;
  if (minScore !== undefined) {
    rows = rows.filter((athlete) => athlete.visibility_score >= minScore);
  }
  const search = filters.q;
  if (search) {
    rows = rows.filter((athlete) =>
      athleteMatchesSearch(
        [
          athlete.user?.full_name,
          athlete.user?.city,
          athlete.user?.country,
          athlete.sport,
          athlete.position,
          athlete.position_primary,
          athlete.position_secondary,
          athlete.current_club,
          athlete.nationality,
          athlete.level,
          athlete.dominant_foot,
          athlete.user?.is_verified ? 'verified' : '',
          JSON.stringify(athlete.highlighted_stats ?? {}),
        ]
          .filter(Boolean)
          .join(' '),
        search,
      ),
    );
  }

  return filters.limit ? rows.slice(0, filters.limit) : rows;
}

export async function getAthleteById(id: string): Promise<AthleteWithUser | null> {
  const rows = unwrap(
    await supabase.rpc('web_athletes', {
      p_id: id,
      p_user_id: null,
      p_limit: 1,
    }),
  ) as AthleteWithUser[];
  return rows[0] ?? null;
}

export async function getAthleteByUserId(userId: string): Promise<AthleteWithUser | null> {
  const rows = unwrap(
    await supabase.rpc('web_athletes', {
      p_id: null,
      p_user_id: userId,
      p_limit: 1,
    }),
  ) as AthleteWithUser[];
  return rows[0] ?? null;
}

export async function updateAthlete(
  id: string,
  patch: Partial<AthleteProfile>,
): Promise<AthleteProfile> {
  return unwrap<AthleteProfile>(
    await supabase.from('athlete_profiles').update(patch).eq('id', id).select('*').single(),
  );
}
