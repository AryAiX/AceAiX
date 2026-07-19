import { supabase } from './supabase';

export interface FootballStats {
  id: string;
  athlete_id: string;
  season: string;
  team: string | null;
  league: string | null;
  apps: number;
  goals: number;
  assists: number;
  minutes: number;
  rating: number | null;
  shots_total: number;
  shots_on: number;
  passes_accuracy: number | null;
  dribbles_success: number;
  tackles: number;
  yellow_cards: number;
  red_cards: number;
  attributes: Record<string, any>;
  source: string;
  last_synced_at: string;
}

export async function fetchFootballStats(athlete_id: string, season?: string): Promise<FootballStats | null> {
  let query = supabase
    .from('performance_records')
    .select('id,athlete_id,sport,season_or_period,stats,source,last_synced_at')
    .eq('athlete_id', athlete_id)
    .ilike('sport', 'football')
    .order('last_synced_at', { ascending: false });
  if (season) query = query.eq('season_or_period', season);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error || !data) return null;

  const stats = (data.stats ?? {}) as Record<string, unknown>;
  const numberValue = (key: string, fallbackKey?: string): number => {
    const value = stats[key] ?? (fallbackKey ? stats[fallbackKey] : undefined);
    return typeof value === 'number' ? value : Number(value ?? 0) || 0;
  };
  const nullableNumber = (key: string, fallbackKey?: string): number | null => {
    const value = stats[key] ?? (fallbackKey ? stats[fallbackKey] : undefined);
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    id: data.id,
    athlete_id: data.athlete_id,
    season: data.season_or_period,
    team: typeof stats.team === 'string' ? stats.team : null,
    league: typeof stats.league === 'string' ? stats.league : null,
    apps: numberValue('apps', 'appearances'),
    goals: numberValue('goals'),
    assists: numberValue('assists'),
    minutes: numberValue('minutes'),
    rating: nullableNumber('rating', 'average_rating'),
    shots_total: numberValue('shots_total'),
    shots_on: numberValue('shots_on'),
    passes_accuracy: nullableNumber('passes_accuracy', 'pass_accuracy'),
    dribbles_success: numberValue('dribbles_success'),
    tackles: numberValue('tackles'),
    yellow_cards: numberValue('yellow_cards'),
    red_cards: numberValue('red_cards'),
    attributes: typeof stats.attributes === 'object' && stats.attributes !== null
      ? stats.attributes as Record<string, unknown>
      : {},
    source: data.source,
    last_synced_at: data.last_synced_at,
  };
}

export async function triggerFootballSync(
  athlete_id: string,
  player_id: string,
  season?: string,
  league?: string
): Promise<{ ok: boolean; error: string | null; fallback?: boolean; reason?: string }> {
  const { data, error } = await supabase.functions.invoke('sync-football', {
    body: { athlete_id, player_id, season, league },
  });
  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };
  if (data?.fallback) return { ok: false, error: null, fallback: true, reason: data.reason };
  return { ok: true, error: null };
}

export async function upsertFootballStatsSelfReported(
  athlete_id: string,
  season: string,
  stats: Partial<FootballStats>
): Promise<{ error: string | null }> {
  const {
    id: _id,
    athlete_id: _athleteId,
    season: _season,
    source: _source,
    last_synced_at: _lastSyncedAt,
    ...statValues
  } = stats;
  const { error } = await supabase.from('performance_records').upsert(
    {
      athlete_id,
      sport: 'Football',
      season_or_period: season,
      stats: statValues,
      source: 'self_reported',
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: 'athlete_id,sport,season_or_period' }
  );
  return { error: error?.message ?? null };
}
