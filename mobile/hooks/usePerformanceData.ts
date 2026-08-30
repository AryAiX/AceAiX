import { useState, useEffect, useCallback } from 'react';
import { fetchLatestRecord, PerformanceRecord } from '@/lib/performanceService';

export function usePerformanceData(athlete_id: string | null | undefined, sport: string | null | undefined) {
  const [record, setRecord] = useState<PerformanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!athlete_id || !sport) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLatestRecord(athlete_id, sport);
      setRecord(result.data);
      setError(result.error);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Performance data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [athlete_id, sport]);

  useEffect(() => { load(); }, [load]);

  return { record, loading, error, refresh: load };
}
