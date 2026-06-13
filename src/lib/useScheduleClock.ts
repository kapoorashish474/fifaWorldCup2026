import { useCallback, useEffect, useState } from 'react';
import { fetchEspnResults, type EspnResult } from './espnResults';

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useEspnResults() {
  const [byId, setById] = useState<Map<string, EspnResult>>(() => new Map());
  const [byTeams, setByTeams] = useState<Map<string, EspnResult>>(() => new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [fetchMs, setFetchMs] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    const start = performance.now();
    try {
      const { byId: idMap, byTeams: teamMap } = await fetchEspnResults();
      setById(idMap);
      setByTeams(teamMap);
      setLastFetchedAt(new Date().toISOString());
      setFetchMs(Math.round(performance.now() - start));
      if (idMap.size === 0) setError('No results returned — try again');
    } catch {
      setError('Could not reach ESPN — check connection and retry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { byId, byTeams, loading, error, lastFetchedAt, fetchMs, refresh, hasData: byId.size > 0 };
}
