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
    .select('*')
    .eq('athlete_id', athlete_id)
    .maybeSingle();
  if (error || !data) return null;
  return data as ChessStats;
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
