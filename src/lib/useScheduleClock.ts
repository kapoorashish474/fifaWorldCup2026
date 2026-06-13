import { useEffect, useState } from 'react';
import { fetchEspnResults, type EspnResult } from './espnResults';

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useEspnResults(refreshMs = 60_000) {
  const [byId, setById] = useState<Map<string, EspnResult>>(() => new Map());
  const [byTeams, setByTeams] = useState<Map<string, EspnResult>>(() => new Map());

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchEspnResults().then(({ byId: idMap, byTeams: teamMap }) => {
        if (!cancelled) {
          setById(idMap);
          setByTeams(teamMap);
        }
      });
    };

    load();
    const id = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refreshMs]);

  return { byId, byTeams };
}
