import { supabase } from './supabase';

export interface ChessStats {
  id: string;
  athlete_id: string;
  rapid_current: number | null;
  rapid_peak: number | null;
  rapid_wins: number;
  rapid_losses: number;
  rapid_draws: number;
  blitz_current: number | null;
  blitz_peak: number | null;
  blitz_wins: number;
  blitz_losses: number;
  blitz_draws: number;
  bullet_current: number | null;
  bullet_peak: number | null;
  bullet_wins: number;
  bullet_losses: number;
  bullet_draws: number;
  classical_current: number | null;
  classical_peak: number | null;
  classical_wins: number;
  classical_losses: number;
  classical_draws: number;
  fide_rating: number | null;
  title: string | null;
  rating_history: Record<string, Array<{ ts: string; r: number }>>;
  recent_games: RecentGame[];
  source: string;
  last_synced_at: string;
}

export interface RecentGame {
  opponent: string;
  opponentRating: number | null;
  result: 'win' | 'loss' | 'draw';
  time_class: string;
  opening: string | null;
  date: string | null;
  accuracy: number | null;
  url: string | null;
}

export interface ChessVariant {
  key: 'rapid' | 'blitz' | 'bullet' | 'classical';
  label: string;
  current: number | null;
  peak: number | null;
  wins: number;
  losses: number;
  draws: number;
}

export function extractVariants(stats: ChessStats): ChessVariant[] {
  return [
    { key: 'rapid', label: 'Rapid', current: stats.rapid_current, peak: stats.rapid_peak, wins: stats.rapid_wins, losses: stats.rapid_losses, draws: stats.rapid_draws },
    { key: 'blitz', label: 'Blitz', current: stats.blitz_current, peak: stats.blitz_peak, wins: stats.blitz_wins, losses: stats.blitz_losses, draws: stats.blitz_draws },
    { key: 'bullet', label: 'Bullet', current: stats.bullet_current, peak: stats.bullet_peak, wins: stats.bullet_wins, losses: stats.bullet_losses, draws: stats.bullet_draws },
    { key: 'classical', label: 'Classical', current: stats.classical_current, peak: stats.classical_peak, wins: stats.classical_wins, losses: stats.classical_losses, draws: stats.classical_draws },
  ].filter(v => v.current != null) as ChessVariant[];
}

export async function fetchChessStats(athlete_id: string): Promise<ChessStats | null> {
  const { data, error } = await supabase
    .from('chess_stats')
    .select('athlete_id,stats,source,last_synced_at')
    .eq('athlete_id', athlete_id)
    .maybeSingle();
  if (error || !data) return null;

  const stats = (data.stats ?? {}) as Record<string, unknown>;
  const numberValue = (key: string): number => {
    const value = stats[key];
    return typeof value === 'number' ? value : Number(value ?? 0) || 0;
  };
  const nullableNumber = (key: string): number | null => {
    const value = stats[key];
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    id: data.athlete_id,
    athlete_id: data.athlete_id,
    rapid_current: nullableNumber('rapid_current'),
    rapid_peak: nullableNumber('rapid_peak'),
    rapid_wins: numberValue('rapid_wins'),
    rapid_losses: numberValue('rapid_losses'),
    rapid_draws: numberValue('rapid_draws'),
    blitz_current: nullableNumber('blitz_current'),
    blitz_peak: nullableNumber('blitz_peak'),
    blitz_wins: numberValue('blitz_wins'),
    blitz_losses: numberValue('blitz_losses'),
    blitz_draws: numberValue('blitz_draws'),
    bullet_current: nullableNumber('bullet_current'),
    bullet_peak: nullableNumber('bullet_peak'),
    bullet_wins: numberValue('bullet_wins'),
    bullet_losses: numberValue('bullet_losses'),
    bullet_draws: numberValue('bullet_draws'),
    classical_current: nullableNumber('classical_current'),
    classical_peak: nullableNumber('classical_peak'),
    classical_wins: numberValue('classical_wins'),
    classical_losses: numberValue('classical_losses'),
    classical_draws: numberValue('classical_draws'),
    fide_rating: nullableNumber('fide_rating'),
    title: typeof stats.title === 'string' ? stats.title : null,
    rating_history: typeof stats.rating_history === 'object' && stats.rating_history !== null
      ? stats.rating_history as ChessStats['rating_history']
      : {},
    recent_games: Array.isArray(stats.recent_games)
      ? stats.recent_games as RecentGame[]
      : [],
    source: data.source,
    last_synced_at: data.last_synced_at,
  };
}

export async function triggerChessSyncFull(
  athlete_id: string,
  chesscom_username?: string | null,
  lichess_username?: string | null
): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabase.functions.invoke('sync-chess', {
    body: { athlete_id, chesscom_username, lichess_username },
  });
  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };
  return { ok: true, error: null };
}

export function isSyncStale(last_synced_at: string, thresholdMs = 3600000): boolean {
  return Date.now() - new Date(last_synced_at).getTime() > thresholdMs;
}

export function sourceDisplayLabel(source: string): string {
  const MAP: Record<string, string> = {
    chesscom: 'via Chess.com',
    lichess: 'via Lichess',
    'chesscom,lichess': 'via Chess.com + Lichess',
    'lichess,chesscom': 'via Chess.com + Lichess',
    self_reported: 'Self-reported',
  };
  return MAP[source] ?? source;
}

export function isVerified(source: string): boolean {
  return source !== 'self_reported';
}
