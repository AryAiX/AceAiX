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
    .from('football_stats')
    .select('*')
    .eq('athlete_id', athlete_id)
    .order('season', { ascending: false });
  if (season) query = query.eq('season', season);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error || !data) return null;
  return data as FootballStats;
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
  const { error } = await supabase.from('football_stats').upsert(
    { ...stats, athlete_id, season, source: 'self_reported', last_synced_at: new Date().toISOString() },
    { onConflict: 'athlete_id,season' }
  );
  return { error: error?.message ?? null };
}
