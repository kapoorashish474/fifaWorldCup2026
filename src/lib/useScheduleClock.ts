import { useEffect, useState } from 'react';
import { GROUP_FIXTURES } from '../data/groupSchedule';
import { fetchEspnStates, type EspnState } from './espnStatus';

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useEspnStates(refreshMs = 60_000) {
  const [states, setStates] = useState<Map<string, EspnState>>(() => new Map());
  useEffect(() => {
    const ids = GROUP_FIXTURES.map((f) => f.id);
    let cancelled = false;

    const load = () => {
      fetchEspnStates(ids).then((map) => {
        if (!cancelled) setStates(map);
      });
    };

    load();
    const id = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refreshMs]);

  return states;
}
