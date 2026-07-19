import { supabase } from './supabase';

export interface PerformanceRecord {
  id: string;
  athlete_id: string;
  sport: string;
  season_or_period: string | null;
  stats: Record<string, any>;
  source: string;
  last_synced_at: string;
}

export async function fetchLatestRecord(
  athlete_id: string,
  sport: string
): Promise<PerformanceRecord | null> {
  const { data, error } = await supabase
    .from('performance_records')
    .select('*')
    .eq('athlete_id', athlete_id)
    .ilike('sport', sport)
    .order('last_synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as PerformanceRecord;
}

export async function upsertRecord(
  athlete_id: string,
  sport: string,
  stats: Record<string, any>,
  source = 'self_reported',
  season_or_period?: string
): Promise<{ error: string | null }> {
  const period = season_or_period ?? new Date().getFullYear().toString();
  const { error } = await supabase
    .from('performance_records')
    .upsert(
      { athlete_id, sport, season_or_period: period, stats, source, last_synced_at: new Date().toISOString() },
      { onConflict: 'athlete_id,sport,season_or_period' }
    );
  return { error: error?.message ?? null };
}

export async function triggerChessSync(
  athlete_id: string,
  chesscom_username?: string | null,
  lichess_username?: string | null
): Promise<{ ok: boolean; error: string | null; stats?: Record<string, any> }> {
  const { data, error } = await supabase.functions.invoke('sync-chess', {
    body: { athlete_id, chesscom_username, lichess_username },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null, stats: data?.stats };
}

export function sourceLabel(source: string): string {
  const MAP: Record<string, string> = {
    self_reported: 'Self-reported',
    chesscom: 'via Chess.com',
    lichess: 'via Lichess',
    'chesscom,lichess': 'via Chess.com + Lichess',
    'lichess,chesscom': 'via Chess.com + Lichess',
    api_sports: 'via API-Sports',
    imported_result: 'Imported result',
  };
  return MAP[source] ?? source;
}

export function isVerifiedSource(source: string): boolean {
  return source !== 'self_reported';
}
