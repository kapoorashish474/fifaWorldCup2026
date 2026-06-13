import { timingFromClock, type MatchTiming } from './matchTime';

/** Lightweight ESPN status lookup for group fixtures (by ESPN event id) */
export type EspnState = 'pre' | 'in' | 'post';

export async function fetchEspnStates(ids: string[]): Promise<Map<string, EspnState>> {
  const map = new Map<string, EspnState>();
  if (!ids.length) return map;

  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=200',
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return map;
    const data = await res.json();
    const want = new Set(ids);
    for (const event of (data as { events?: { id: string; competitions?: { status?: { type?: { state?: string } } }[] }[] }).events ?? []) {
      if (!want.has(event.id)) continue;
      const state = event.competitions?.[0]?.status?.type?.state;
      if (state === 'in' || state === 'post' || state === 'pre') map.set(event.id, state);
    }
  } catch {
    /* fall back to clock-based timing */
  }
  return map;
}

export function resolveTiming(
  kickoff: string,
  espnState: EspnState | undefined,
  now = Date.now(),
): MatchTiming {
  if (espnState === 'in') return 'live';
  if (espnState === 'post') return 'finished';
  if (espnState === 'pre') return 'upcoming';
  return timingFromClock(kickoff, now);
}

/** ESPN event id from group prediction id e.g. c-grp-760415 → 760415 */
export function espnIdFromMatchId(id: string): string | undefined {
  const m = id.match(/-grp-(\d+)$/);
  return m?.[1];
}
