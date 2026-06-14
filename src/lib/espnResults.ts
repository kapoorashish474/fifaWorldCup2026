import { timingFromClock, type MatchTiming } from './matchTime';

const TEAM_ALIASES: Record<string, string> = {
  'united states': 'USA',
  usa: 'USA',
  'bosnia-herzegovina': 'Bosnia & Herzegovina',
  'bosnia and herzegovina': 'Bosnia & Herzegovina',
  'cote d ivoire': 'Ivory Coast',
  "côte d'ivoire": 'Ivory Coast',
  'czech republic': 'Czechia',
  'korea republic': 'South Korea',
  'south korea': 'South Korea',
  'dr congo': 'DR Congo',
  'congo dr': 'DR Congo',
  'democratic republic of congo': 'DR Congo',
  curaçao: 'Curacao',
  turkiye: 'Turkey',
  turkey: 'Turkey',
};

export type EspnState = 'pre' | 'in' | 'post';

export interface EspnResult {
  id: string;
  state: EspnState;
  teamA: string;
  teamB: string;
  score: string;
  winner?: string;
  clock?: string;
  venue?: string;
}

export function normalizeTeam(name: string): string {
  const key = name.trim().toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ');
  return TEAM_ALIASES[key] ?? name.trim();
}

export function teamsKey(teamA: string, teamB: string): string {
  return [teamA, teamB].sort().join('|');
}

function parseEvent(event: {
  id: string;
  competitions?: {
    status?: { type?: { state?: string; completed?: boolean }; displayClock?: string };
    venue?: { fullName?: string; address?: { city?: string; country?: string } };
    competitors?: { homeAway: string; winner?: boolean; score: string; team: { displayName: string } }[];
  }[];
}): EspnResult | null {
  const comp = event.competitions?.[0];
  if (!comp?.competitors || comp.competitors.length < 2) return null;

  const home = comp.competitors.find((c) => c.homeAway === 'home') ?? comp.competitors[0];
  const away = comp.competitors.find((c) => c.homeAway === 'away') ?? comp.competitors[1];
  const teamA = normalizeTeam(home.team.displayName);
  const teamB = normalizeTeam(away.team.displayName);
  const scoreA = parseInt(home.score, 10) || 0;
  const scoreB = parseInt(away.score, 10) || 0;
  const completed = comp.status?.type?.completed ?? false;
  const state = comp.status?.type?.state;
  const espnState: EspnState = state === 'in' ? 'in' : state === 'post' || completed ? 'post' : 'pre';
  const winner = completed ? (home.winner ? teamA : away.winner ? teamB : undefined) : undefined;
  const v = comp.venue;
  const city = v?.address?.city;
  const country = v?.address?.country;
  const venue = v?.fullName && city
    ? `${v.fullName} · ${city}${country ? `, ${country}` : ''}`
    : city
      ? `${city}${country ? `, ${country}` : ''}`
      : v?.fullName;

  return {
    id: event.id,
    state: espnState,
    teamA,
    teamB,
    score: `${scoreA}–${scoreB}`,
    winner,
    clock: comp.status?.displayClock,
    venue,
  };
}

export async function fetchEspnResults(): Promise<{
  byId: Map<string, EspnResult>;
  byTeams: Map<string, EspnResult>;
}> {
  const byId = new Map<string, EspnResult>();
  const byTeams = new Map<string, EspnResult>();

  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=200',
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return { byId, byTeams };
    const data = await res.json();
    for (const event of (data as { events?: unknown[] }).events ?? []) {
      const parsed = parseEvent(event as Parameters<typeof parseEvent>[0]);
      if (!parsed) continue;
      byId.set(parsed.id, parsed);
      byTeams.set(teamsKey(parsed.teamA, parsed.teamB), parsed);
    }
  } catch {
    /* offline / blocked */
  }
  return { byId, byTeams };
}

export function resolveTiming(result: EspnResult | undefined, kickoff: string, now = Date.now()): MatchTiming {
  if (result?.state === 'in') return 'live';
  if (result?.state === 'post') return 'finished';
  if (result?.state === 'pre') return 'upcoming';
  return timingFromClock(kickoff, now);
}

export function espnIdFromMatchId(id: string): string | undefined {
  return id.match(/-grp-(\d+)$/)?.[1];
}

export function lookupResult(
  espnId: string | undefined,
  teamA: string,
  teamB: string,
  byId: Map<string, EspnResult>,
  byTeams: Map<string, EspnResult>,
): EspnResult | undefined {
  if (espnId) {
    const byIdHit = byId.get(espnId);
    if (byIdHit) return byIdHit;
  }
  return byTeams.get(teamsKey(teamA, teamB));
}

export function predictionCorrect(predictedWinner: string, actual: EspnResult): boolean | null {
  if (actual.state !== 'post') return null;
  if (!actual.winner) return false;
  return predictedWinner === actual.winner;
}

export interface ModelAccuracy {
  id: string;
  name: string;
  correct: number;
  total: number;
}

export function computeModelAccuracy(
  models: { id: string; name: string; matches: { id: string; stage?: string; teamA: string; teamB: string; winner: string }[] }[],
  byId: Map<string, EspnResult>,
  byTeams: Map<string, EspnResult>,
): ModelAccuracy[] {
  return models.map((md) => {
    let correct = 0;
    let total = 0;
    for (const m of md.matches) {
      if (m.stage !== 'group') continue;
      const espnId = espnIdFromMatchId(m.id);
      const actual = lookupResult(espnId, m.teamA, m.teamB, byId, byTeams);
      if (!actual || actual.state !== 'post') continue;
      total++;
      if (predictionCorrect(m.winner, actual)) correct++;
    }
    return { id: md.id, name: md.name, correct, total };
  });
}

export function accuracyPct(correct: number, total: number): string {
  return total === 0 ? '—' : `${Math.round((correct / total) * 100)}%`;
}
