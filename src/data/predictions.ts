import { GROUP_FIXTURES, type GroupFixture } from './groupSchedule';
import { KNOCKOUT_KICKOFFS } from './knockoutKickoffs';
import { KNOCKOUT_VENUES } from './knockoutVenues';

export type Confidence = 'high' | 'moderate' | 'low';

export interface MatchPrediction {
  id: string;
  kickoff: string;
  slot: number;
  stage: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'bronze' | 'final';
  group?: string;
  venue?: string;
  teamA: string;
  teamB: string;
  winner: string;
  score: string;
  confidence: Confidence;
  pct: number;
}

export interface ModelPrediction {
  id: string;
  name: string;
  champion: string;
  finalScore: string;
  runnerUp: string;
  winPct: { team: string; pct: number }[];
  bestThird: string[];
  groups: { letter: string; teams: [string, string, string, string] }[];
  matches: MatchPrediction[];
}

export interface ActualResult {
  matchId: string;
  winner: string;
  score: string;
}

const GROUPS: ModelPrediction['groups'] = [
  { letter: 'A', teams: ['Mexico', 'South Korea', 'Czechia', 'South Africa'] },
  { letter: 'B', teams: ['Switzerland', 'Canada', 'Bosnia & Herzegovina', 'Qatar'] },
  { letter: 'C', teams: ['Brazil', 'Morocco', 'Scotland', 'Haiti'] },
  { letter: 'D', teams: ['USA', 'Turkey', 'Australia', 'Paraguay'] },
  { letter: 'E', teams: ['Germany', 'Ivory Coast', 'Ecuador', 'Curacao'] },
  { letter: 'F', teams: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'] },
  { letter: 'G', teams: ['Belgium', 'Iran', 'Egypt', 'New Zealand'] },
  { letter: 'H', teams: ['Spain', 'Uruguay', 'Saudi Arabia', 'Cape Verde'] },
  { letter: 'I', teams: ['France', 'Norway', 'Senegal', 'Iraq'] },
  { letter: 'J', teams: ['Argentina', 'Austria', 'Algeria', 'Jordan'] },
  { letter: 'K', teams: ['Portugal', 'Colombia', 'Uzbekistan', 'DR Congo'] },
  { letter: 'L', teams: ['England', 'Croatia', 'Ghana', 'Panama'] },
];

function mk(
  id: string,
  stage: MatchPrediction['stage'],
  a: string,
  b: string,
  winner: string,
  score: string,
  confidence: Confidence,
  group?: string,
): MatchPrediction {
  return { id, kickoff: '', slot: 0, stage, group, teamA: a, teamB: b, winner, score, confidence, pct: 0 };
}

function variedPct(id: string, confidence: Confidence): number {
  const hash = [...id].reduce((s, c) => s + c.charCodeAt(0), 0);
  const tiers = { high: [74, 94], moderate: [46, 71], low: [28, 45] } as const;
  const [lo, hi] = tiers[confidence];
  return lo + (hash % (hi - lo + 1));
}

function assignDatesAndPct() {
  for (const model of MODELS) {
    const n: Partial<Record<MatchPrediction['stage'], number>> = {};
    for (const m of model.matches) {
      if (m.stage === 'group') continue;
      const i = n[m.stage] ?? 0;
      m.kickoff = KNOCKOUT_KICKOFFS[m.stage as keyof typeof KNOCKOUT_KICKOFFS][i];
      m.venue = KNOCKOUT_VENUES[m.kickoff];
      m.slot = i;
      m.pct = variedPct(m.id, m.confidence);
      n[m.stage] = i + 1;
    }
  }
}

export const TOURNAMENT_START = '2026-06-11';
export const TOURNAMENT_END = '2026-07-19';
export const KNOCKOUT_START = '2026-06-28';

function tournamentDates(start: string, end: string): string[] {
  const out: string[] = [];
  let t = Date.parse(`${start}T12:00:00Z`);
  const endT = Date.parse(`${end}T12:00:00Z`);
  while (t <= endT) {
    const d = new Date(t);
    out.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`,
    );
    t += 86_400_000;
  }
  return out;
}

/** Source of truth — keep in sync with Analysis/*.md */
export const MODELS: ModelPrediction[] = [
  {
    id: 'claude',
    name: 'Claude',
    champion: 'Spain',
    finalScore: '2-1 AET',
    runnerUp: 'France',
    winPct: [
      { team: 'Spain', pct: 22 }, { team: 'France', pct: 20 }, { team: 'Argentina', pct: 18 },
      { team: 'Brazil', pct: 15 }, { team: 'England', pct: 10 }, { team: 'Germany', pct: 7 },
      { team: 'Portugal', pct: 5 }, { team: 'Rest', pct: 3 },
    ],
    bestThird: ['Scotland', 'Czechia', 'Bosnia & Herzegovina', 'Australia', 'Ecuador', 'Sweden', 'Egypt', 'Senegal'],
    groups: GROUPS,
    matches: [
      mk('c-r32-1', 'r32', 'Mexico', 'Scotland', 'Mexico', '2-0', 'high'),
      mk('c-r32-2', 'r32', 'South Korea', 'Canada', 'South Korea', '2-1', 'moderate'),
      mk('c-r32-3', 'r32', 'Switzerland', 'Sweden', 'Switzerland', '2-0', 'high'),
      mk('c-r32-4', 'r32', 'Brazil', 'Morocco', 'Brazil', '2-1', 'high'),
      mk('c-r32-5', 'r32', 'USA', 'Ghana', 'USA', '2-0', 'high'),
      mk('c-r32-6', 'r32', 'Germany', 'Japan', 'Germany', '2-1', 'moderate'),
      mk('c-r32-7', 'r32', 'Ivory Coast', 'Algeria', 'Ivory Coast', '1-0', 'moderate'),
      mk('c-r32-8', 'r32', 'Netherlands', 'Senegal', 'Netherlands', '2-0', 'high'),
      mk('c-r32-9', 'r32', 'Belgium', 'Australia', 'Belgium', '2-1', 'moderate'),
      mk('c-r32-10', 'r32', 'Spain', 'Uzbekistan', 'Spain', '3-0', 'high'),
      mk('c-r32-11', 'r32', 'France', 'Austria', 'France', '3-1', 'high'),
      mk('c-r32-12', 'r32', 'Norway', 'Bosnia & Herzegovina', 'Norway', '2-1', 'moderate'),
      mk('c-r32-13', 'r32', 'Argentina', 'Egypt', 'Argentina', '2-0', 'high'),
      mk('c-r32-14', 'r32', 'Portugal', 'Croatia', 'Portugal', '2-1', 'high'),
      mk('c-r32-15', 'r32', 'England', 'Czechia', 'England', '3-0', 'high'),
      mk('c-r32-16', 'r32', 'Uruguay', 'Turkey', 'Uruguay', '2-1', 'moderate'),
      mk('c-r16-1', 'r16', 'Brazil', 'South Korea', 'Brazil', '2-0', 'high'),
      mk('c-r16-2', 'r16', 'Spain', 'Mexico', 'Spain', '2-0', 'high'),
      mk('c-r16-3', 'r16', 'France', 'USA', 'France', '2-1', 'high'),
      mk('c-r16-4', 'r16', 'Argentina', 'Ivory Coast', 'Argentina', '2-0', 'high'),
      mk('c-r16-5', 'r16', 'England', 'Belgium', 'England', '2-1', 'moderate'),
      mk('c-r16-6', 'r16', 'Germany', 'Uruguay', 'Germany', '2-1', 'moderate'),
      mk('c-r16-7', 'r16', 'Portugal', 'Norway', 'Portugal', '2-1', 'high'),
      mk('c-r16-8', 'r16', 'Netherlands', 'Switzerland', 'Netherlands', '2-1', 'high'),
      mk('c-qf-1', 'qf', 'Brazil', 'Spain', 'Spain', '1-0 AET', 'moderate'),
      mk('c-qf-2', 'qf', 'France', 'Argentina', 'France', '2-1', 'moderate'),
      mk('c-qf-3', 'qf', 'England', 'Germany', 'England', '2-1', 'moderate'),
      mk('c-qf-4', 'qf', 'Portugal', 'Netherlands', 'Portugal', '3-2', 'moderate'),
      mk('c-sf-1', 'sf', 'Spain', 'England', 'Spain', '2-1', 'moderate'),
      mk('c-sf-2', 'sf', 'France', 'Portugal', 'France', '2-1 AET', 'moderate'),
      mk('c-bronze', 'bronze', 'England', 'Portugal', 'England', '2-1', 'moderate'),
      mk('c-final', 'final', 'Spain', 'France', 'Spain', '2-1 AET', 'moderate'),
    ],
  },
  {
    id: 'gpt',
    name: 'GPT',
    champion: 'France',
    finalScore: '3-2 AET',
    runnerUp: 'Argentina',
    winPct: [
      { team: 'France', pct: 24 }, { team: 'Argentina', pct: 21 }, { team: 'Brazil', pct: 18 },
      { team: 'England', pct: 12 }, { team: 'Spain', pct: 11 }, { team: 'Germany', pct: 8 },
      { team: 'Portugal', pct: 4 }, { team: 'Rest', pct: 2 },
    ],
    bestThird: ['Czechia', 'Bosnia & Herzegovina', 'Scotland', 'Australia', 'Ecuador', 'Sweden', 'Egypt', 'Senegal'],
    groups: GROUPS,
    matches: [
      mk('g-r32-1', 'r32', 'Mexico', 'Scotland', 'Mexico', '2-1', 'high'),
      mk('g-r32-2', 'r32', 'South Korea', 'Canada', 'Canada', '1-0', 'moderate'),
      mk('g-r32-3', 'r32', 'Switzerland', 'Sweden', 'Switzerland', '1-0', 'high'),
      mk('g-r32-4', 'r32', 'Brazil', 'Senegal', 'Brazil', '3-1', 'high'),
      mk('g-r32-5', 'r32', 'USA', 'Ghana', 'USA', '2-1', 'moderate'),
      mk('g-r32-6', 'r32', 'Germany', 'Japan', 'Germany', '2-0', 'high'),
      mk('g-r32-7', 'r32', 'Ivory Coast', 'Algeria', 'Ivory Coast', '2-1', 'moderate'),
      mk('g-r32-8', 'r32', 'Netherlands', 'Ecuador', 'Netherlands', '2-0', 'high'),
      mk('g-r32-9', 'r32', 'Belgium', 'Australia', 'Belgium', '2-1', 'moderate'),
      mk('g-r32-10', 'r32', 'Spain', 'Uzbekistan', 'Spain', '3-0', 'high'),
      mk('g-r32-11', 'r32', 'France', 'Austria', 'France', '2-0', 'high'),
      mk('g-r32-12', 'r32', 'Norway', 'Bosnia & Herzegovina', 'Norway', '1-0', 'moderate'),
      mk('g-r32-13', 'r32', 'Argentina', 'Egypt', 'Argentina', '2-0', 'high'),
      mk('g-r32-14', 'r32', 'Portugal', 'Croatia', 'Portugal', '1-0', 'moderate'),
      mk('g-r32-15', 'r32', 'England', 'Czechia', 'England', '3-1', 'high'),
      mk('g-r32-16', 'r32', 'Morocco', 'Turkey', 'Morocco', '2-1', 'moderate'),
      mk('g-r16-1', 'r16', 'Brazil', 'Canada', 'Brazil', '2-0', 'high'),
      mk('g-r16-2', 'r16', 'France', 'USA', 'France', '3-1', 'high'),
      mk('g-r16-3', 'r16', 'Argentina', 'Morocco', 'Argentina', '2-1', 'moderate'),
      mk('g-r16-4', 'r16', 'England', 'Netherlands', 'England', '2-1', 'moderate'),
      mk('g-r16-5', 'r16', 'Spain', 'Switzerland', 'Spain', '2-0', 'high'),
      mk('g-r16-6', 'r16', 'Germany', 'Belgium', 'Germany', '2-1', 'moderate'),
      mk('g-r16-7', 'r16', 'Portugal', 'Norway', 'Portugal', '2-0', 'high'),
      mk('g-r16-8', 'r16', 'Mexico', 'Ivory Coast', 'Mexico', '1-0', 'low'),
      mk('g-qf-1', 'qf', 'Brazil', 'Spain', 'Brazil', '2-1', 'moderate'),
      mk('g-qf-2', 'qf', 'France', 'England', 'France', '2-1', 'moderate'),
      mk('g-qf-3', 'qf', 'Argentina', 'Germany', 'Argentina', '1-0', 'moderate'),
      mk('g-qf-4', 'qf', 'Portugal', 'Mexico', 'Portugal', '2-0', 'high'),
      mk('g-sf-1', 'sf', 'Brazil', 'France', 'France', '2-1', 'moderate'),
      mk('g-sf-2', 'sf', 'Argentina', 'Portugal', 'Argentina', '2-1 AET', 'moderate'),
      mk('g-bronze', 'bronze', 'Portugal', 'Germany', 'Portugal', '3-2', 'moderate'),
      mk('g-final', 'final', 'France', 'Argentina', 'France', '3-2 AET', 'moderate'),
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    champion: 'Brazil',
    finalScore: '3-1',
    runnerUp: 'England',
    winPct: [
      { team: 'Brazil', pct: 23 }, { team: 'England', pct: 18 }, { team: 'Argentina', pct: 17 },
      { team: 'France', pct: 16 }, { team: 'Spain', pct: 12 }, { team: 'Germany', pct: 7 },
      { team: 'Portugal', pct: 4 }, { team: 'Rest', pct: 3 },
    ],
    bestThird: ['Scotland', 'Bosnia & Herzegovina', 'Australia', 'Ecuador', 'Sweden', 'Egypt', 'Senegal', 'Algeria'],
    groups: GROUPS,
    matches: [
      mk('m-r32-1', 'r32', 'Mexico', 'Scotland', 'Mexico', '1-0', 'high'),
      mk('m-r32-2', 'r32', 'South Korea', 'Canada', 'South Korea', '2-1', 'moderate'),
      mk('m-r32-3', 'r32', 'Switzerland', 'Algeria', 'Switzerland', '2-0', 'high'),
      mk('m-r32-4', 'r32', 'Brazil', 'Senegal', 'Brazil', '2-0', 'high'),
      mk('m-r32-5', 'r32', 'USA', 'Ghana', 'USA', '3-1', 'high'),
      mk('m-r32-6', 'r32', 'Germany', 'Japan', 'Japan', '2-1', 'low'),
      mk('m-r32-7', 'r32', 'Ivory Coast', 'Ecuador', 'Ivory Coast', '1-0', 'moderate'),
      mk('m-r32-8', 'r32', 'Netherlands', 'Sweden', 'Netherlands', '3-1', 'high'),
      mk('m-r32-9', 'r32', 'Belgium', 'Uruguay', 'Belgium', '2-1', 'moderate'),
      mk('m-r32-10', 'r32', 'Spain', 'Uzbekistan', 'Spain', '4-0', 'high'),
      mk('m-r32-11', 'r32', 'France', 'Austria', 'France', '3-0', 'high'),
      mk('m-r32-12', 'r32', 'Norway', 'Bosnia & Herzegovina', 'Norway', '2-1', 'moderate'),
      mk('m-r32-13', 'r32', 'Argentina', 'Egypt', 'Argentina', '2-0', 'high'),
      mk('m-r32-14', 'r32', 'Portugal', 'Croatia', 'Portugal', '2-1', 'high'),
      mk('m-r32-15', 'r32', 'England', 'Australia', 'England', '2-0', 'high'),
      mk('m-r32-16', 'r32', 'Morocco', 'Turkey', 'Morocco', '1-0', 'moderate'),
      mk('m-r16-1', 'r16', 'Brazil', 'South Korea', 'Brazil', '3-1', 'high'),
      mk('m-r16-2', 'r16', 'Spain', 'Mexico', 'Spain', '2-0', 'high'),
      mk('m-r16-3', 'r16', 'France', 'USA', 'France', '2-1', 'high'),
      mk('m-r16-4', 'r16', 'Argentina', 'Ivory Coast', 'Argentina', '2-0', 'high'),
      mk('m-r16-5', 'r16', 'England', 'Belgium', 'England', '1-0', 'moderate'),
      mk('m-r16-6', 'r16', 'Japan', 'Uruguay', 'Japan', '2-1 AET', 'low'),
      mk('m-r16-7', 'r16', 'Portugal', 'Norway', 'Portugal', '2-1', 'moderate'),
      mk('m-r16-8', 'r16', 'Netherlands', 'Switzerland', 'Netherlands', '2-1', 'moderate'),
      mk('m-qf-1', 'qf', 'Brazil', 'Spain', 'Brazil', '2-1', 'moderate'),
      mk('m-qf-2', 'qf', 'France', 'Argentina', 'Argentina', '1-0', 'moderate'),
      mk('m-qf-3', 'qf', 'England', 'Japan', 'England', '3-1', 'high'),
      mk('m-qf-4', 'qf', 'Portugal', 'Netherlands', 'Portugal', '2-1 AET', 'moderate'),
      mk('m-sf-1', 'sf', 'Brazil', 'Argentina', 'Brazil', '2-1', 'moderate'),
      mk('m-sf-2', 'sf', 'England', 'Portugal', 'England', '2-0', 'high'),
      mk('m-bronze', 'bronze', 'Portugal', 'Argentina', 'Portugal', '2-1', 'moderate'),
      mk('m-final', 'final', 'Brazil', 'England', 'Brazil', '3-1', 'moderate'),
    ],
  },
];

assignDatesAndPct();

function teamRank(md: ModelPrediction, team: string, letter: string): number {
  const g = md.groups.find((x) => x.letter === letter)!;
  const i = g.teams.indexOf(team as (typeof g.teams)[number]);
  return i >= 0 ? i + 1 : 99;
}

function groupMatchScore(rankW: number, rankL: number, seed: string, winnerIsA: boolean): string {
  const gap = rankL - rankW;
  const h = [...seed].reduce((s, c) => s + c.charCodeAt(0), 0);
  let wG: number;
  let lG: number;
  if (gap >= 3) {
    wG = h % 2 ? 3 : 2;
    lG = 0;
  } else if (gap === 2) {
    wG = 2;
    lG = h % 2 ? 0 : 1;
  } else {
    wG = h % 2 ? 2 : 1;
    lG = wG === 2 ? 1 : 0;
  }
  return winnerIsA ? `${wG}-${lG}` : `${lG}-${wG}`;
}

function groupConfidence(rankW: number, rankL: number): Confidence {
  const gap = rankL - rankW;
  if (gap >= 2) return 'high';
  if (gap === 1 && rankW <= 2) return 'moderate';
  return 'low';
}

function mkGroup(md: ModelPrediction, f: GroupFixture, slot: number): MatchPrediction {
  const rankA = teamRank(md, f.teamA, f.group);
  const rankB = teamRank(md, f.teamB, f.group);
  const aWins = rankA < rankB;
  const winner = aWins ? f.teamA : f.teamB;
  const rankW = Math.min(rankA, rankB);
  const rankL = Math.max(rankA, rankB);
  const id = `${md.id}-grp-${f.id}`;
  const confidence = groupConfidence(rankW, rankL);
  return {
    id,
    kickoff: f.kickoff,
    slot,
    stage: 'group',
    group: f.group,
    venue: f.venue,
    teamA: f.teamA,
    teamB: f.teamB,
    winner,
    score: groupMatchScore(rankW, rankL, id, aWins),
    confidence,
    pct: variedPct(id, confidence),
  };
}

function appendGroupPredictions() {
  for (const md of MODELS) {
    const groupMatches = GROUP_FIXTURES.map((f, i) => mkGroup(md, f, i));
    md.matches = [...groupMatches, ...md.matches];
  }
}

appendGroupPredictions();

export const GROUP_LETTERS = GROUPS.map((g) => g.letter);

export const ALL_TEAMS = [...new Set(GROUPS.flatMap((g) => g.teams))].sort((a, b) =>
  a.localeCompare(b),
);

export const GROUP_STAGE = { key: 'group' as const, label: 'Group stage', color: '#059669' };

export const STAGES: { key: MatchPrediction['stage']; label: string; color: string }[] = [
  { key: 'r32', label: 'Round of 32', color: '#2563eb' },
  { key: 'r16', label: 'Round of 16', color: '#7c3aed' },
  { key: 'qf', label: 'Quarterfinals', color: '#ea580c' },
  { key: 'sf', label: 'Semifinals', color: '#db2777' },
  { key: 'bronze', label: 'Bronze', color: '#a16207' },
  { key: 'final', label: 'Final', color: '#ca8a04' },
];

export type ScheduleStage = typeof GROUP_STAGE.key | MatchPrediction['stage'];

export const ALL_STAGES: { key: ScheduleStage; label: string; color: string }[] = [
  GROUP_STAGE,
  ...STAGES,
];

export const ALL_DATES = tournamentDates(TOURNAMENT_START, TOURNAMENT_END);

export function slotKey(m: MatchPrediction) {
  if (m.stage === 'group') return `group|${m.kickoff}|${m.teamA}|${m.teamB}`;
  return `${m.stage}|${m.slot}`;
}

export function pctClass(pct: number) {
  if (pct >= 75) return 'pct-high';
  if (pct >= 50) return 'pct-mid';
  return 'pct-low';
}
