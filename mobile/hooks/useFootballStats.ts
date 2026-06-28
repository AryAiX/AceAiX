import { useState, useEffect, useCallback } from 'react';
import { FootballStats, fetchFootballStats } from '@/lib/footballService';

export function useFootballStats(athlete_id: string | null | undefined, season?: string) {
  const [stats, setStats] = useState<FootballStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!athlete_id) return;
    setLoading(true);
    setError(null);
    const data = await fetchFootballStats(athlete_id, season);
    setStats(data);
    setLoading(false);
  }, [athlete_id, season]);

  useEffect(() => { load(); }, [load]);

  return { stats, loading, error, refresh: load };
}
