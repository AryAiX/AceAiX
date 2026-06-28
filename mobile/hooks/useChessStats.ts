import { useState, useEffect, useCallback } from 'react';
import { ChessStats, fetchChessStats } from '@/lib/chessService';

export function useChessStats(athlete_id: string | null | undefined) {
  const [stats, setStats] = useState<ChessStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!athlete_id) return;
    setLoading(true);
    setError(null);
    const data = await fetchChessStats(athlete_id);
    setStats(data);
    setLoading(false);
  }, [athlete_id]);

  useEffect(() => { load(); }, [load]);

  return { stats, loading, error, refresh: load };
}
