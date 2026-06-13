export type Confidence = 'high' | 'moderate' | 'low';

export const CONFIDENCE_PCT: Record<Confidence, number> = {
  high: 85,
  moderate: 60,
  low: 40,
};

export interface GroupPosition {
  pos: number;
  team: string;
  status: string;
}

export interface MatchPrediction {
  id: string;
  date: string;
  stage: 'r32' | 'r16' | 'qf' | 'sf' | 'bronze' | 'final';
  teamA: string;
  teamB: string;
  predictedWinner: string;
  predictedScore: string;
  confidence: Confidence;
  confidencePct: number;
}

export interface ModelPrediction {
  id: string;
  label: string;
  generatedAt: string;
  champion: { team: string; score: string; vs: string; confidence: Confidence; confidencePct: number };
  winnerProbabilities: { team: string; pct: number }[];
  groups: { group: string; positions: GroupPosition[] }[];
  bestThirdPlace: string[];
  matches: MatchPrediction[];
}

/** Real-world results — update this file as the tournament progresses */
export interface ActualResult {
  matchId: string;
  actualWinner: string;
  actualScore: string;
}

export const TOURNAMENT_START = '2026-06-11';
export const TOURNAMENT_END = '2026-07-19';

export const STAGE_DATES: Record<string, { start: string; end: string; label: string }> = {
  group: { start: '2026-06-11', end: '2026-06-27', label: 'Group Stage' },
  r32: { start: '2026-06-28', end: '2026-07-03', label: 'Round of 32' },
  r16: { start: '2026-07-04', end: '2026-07-07', label: 'Round of 16' },
  qf: { start: '2026-07-09', end: '2026-07-11', label: 'Quarterfinals' },
  sf: { start: '2026-07-14', end: '2026-07-15', label: 'Semifinals' },
  bronze: { start: '2026-07-18', end: '2026-07-18', label: 'Bronze Medal' },
  final: { start: '2026-07-19', end: '2026-07-19', label: 'Final' },
};

const SHARED_GROUPS: ModelPrediction['groups'] = [
  { group: 'A', positions: [{ pos: 1, team: 'Mexico', status: 'Auto qualify' }, { pos: 2, team: 'South Korea', status: 'Auto qualify' }, { pos: 3, team: 'Czechia', status: 'Best 3rd' }, { pos: 4, team: 'South Africa', status: 'Eliminated' }] },
  { group: 'B', positions: [{ pos: 1, team: 'Switzerland', status: 'Auto qualify' }, { pos: 2, team: 'Canada', status: 'Auto qualify' }, { pos: 3, team: 'Bosnia & Herzegovina', status: 'Best 3rd' }, { pos: 4, team: 'Qatar', status: 'Eliminated' }] },
  { group: 'C', positions: [{ pos: 1, team: 'Brazil', status: 'Auto qualify' }, { pos: 2, team: 'Morocco', status: 'Auto qualify' }, { pos: 3, team: 'Scotland', status: 'Best 3rd' }, { pos: 4, team: 'Haiti', status: 'Eliminated' }] },
  { group: 'D', positions: [{ pos: 1, team: 'USA', status: 'Auto qualify' }, { pos: 2, team: 'Turkey', status: 'Auto qualify' }, { pos: 3, team: 'Australia', status: 'Best 3rd' }, { pos: 4, team: 'Paraguay', status: 'Eliminated' }] },
  { group: 'E', positions: [{ pos: 1, team: 'Germany', status: 'Auto qualify' }, { pos: 2, team: 'Ivory Coast', status: 'Auto qualify' }, { pos: 3, team: 'Ecuador', status: 'Best 3rd' }, { pos: 4, team: 'Curacao', status: 'Eliminated' }] },
  { group: 'F', positions: [{ pos: 1, team: 'Netherlands', status: 'Auto qualify' }, { pos: 2, team: 'Japan', status: 'Auto qualify' }, { pos: 3, team: 'Sweden', status: 'Best 3rd' }, { pos: 4, team: 'Tunisia', status: 'Eliminated' }] },
  { group: 'G', positions: [{ pos: 1, team: 'Belgium', status: 'Auto qualify' }, { pos: 2, team: 'Iran', status: 'Auto qualify' }, { pos: 3, team: 'Egypt', status: 'Best 3rd' }, { pos: 4, team: 'New Zealand', status: 'Eliminated' }] },
  { group: 'H', positions: [{ pos: 1, team: 'Spain', status: 'Auto qualify' }, { pos: 2, team: 'Uruguay', status: 'Auto qualify' }, { pos: 3, team: 'Saudi Arabia', status: 'Best 3rd' }, { pos: 4, team: 'Cape Verde', status: 'Eliminated' }] },
  { group: 'I', positions: [{ pos: 1, team: 'France', status: 'Auto qualify' }, { pos: 2, team: 'Norway', status: 'Auto qualify' }, { pos: 3, team: 'Senegal', status: 'Best 3rd' }, { pos: 4, team: 'Iraq', status: 'Eliminated' }] },
  { group: 'J', positions: [{ pos: 1, team: 'Argentina', status: 'Auto qualify' }, { pos: 2, team: 'Austria', status: 'Auto qualify' }, { pos: 3, team: 'Algeria', status: 'Best 3rd' }, { pos: 4, team: 'Jordan', status: 'Eliminated' }] },
  { group: 'K', positions: [{ pos: 1, team: 'Portugal', status: 'Auto qualify' }, { pos: 2, team: 'Colombia', status: 'Auto qualify' }, { pos: 3, team: 'Uzbekistan', status: 'Best 3rd' }, { pos: 4, team: 'DR Congo', status: 'Eliminated' }] },
  { group: 'L', positions: [{ pos: 1, team: 'England', status: 'Auto qualify' }, { pos: 2, team: 'Croatia', status: 'Auto qualify' }, { pos: 3, team: 'Ghana', status: 'Best 3rd' }, { pos: 4, team: 'Panama', status: 'Eliminated' }] },
];

function m(
  id: string,
  date: string,
  stage: MatchPrediction['stage'],
  teamA: string,
  teamB: string,
  winner: string,
  score: string,
  confidence: Confidence,
): MatchPrediction {
  return {
    id,
    date,
    stage,
    teamA,
    teamB,
    predictedWinner: winner,
    predictedScore: score,
    confidence,
    confidencePct: CONFIDENCE_PCT[confidence],
  };
}

export const models: ModelPrediction[] = [
  {
    id: 'claude',
    label: 'Claude',
    generatedAt: '2026-06-13',
    champion: { team: 'Spain', score: '2-1 AET', vs: 'France', confidence: 'moderate', confidencePct: 65 },
    winnerProbabilities: [
      { team: 'Spain', pct: 22 },
      { team: 'France', pct: 20 },
      { team: 'Argentina', pct: 18 },
      { team: 'Brazil', pct: 15 },
      { team: 'England', pct: 10 },
      { team: 'Germany', pct: 7 },
      { team: 'Portugal', pct: 5 },
      { team: 'Rest', pct: 3 },
    ],
    groups: SHARED_GROUPS,
    bestThirdPlace: ['Czechia', 'Bosnia & Herzegovina', 'Scotland', 'Australia', 'Ecuador', 'Sweden', 'Egypt', 'Senegal'],
    matches: [
      m('claude-r32-1', '2026-06-28', 'r32', 'Mexico', 'Scotland', 'Mexico', '2-0', 'high'),
      m('claude-r32-2', '2026-06-28', 'r32', 'South Korea', 'Canada', 'South Korea', '2-1', 'moderate'),
      m('claude-r32-3', '2026-06-28', 'r32', 'Switzerland', 'Sweden', 'Switzerland', '2-0', 'high'),
      m('claude-r32-4', '2026-06-29', 'r32', 'Brazil', 'Senegal', 'Brazil', '2-1', 'high'),
      m('claude-r32-5', '2026-06-29', 'r32', 'USA', 'Ghana', 'USA', '2-0', 'high'),
      m('claude-r32-6', '2026-06-29', 'r32', 'Germany', 'Japan', 'Germany', '2-1', 'moderate'),
      m('claude-r32-7', '2026-06-30', 'r32', 'Ivory Coast', 'Algeria', 'Ivory Coast', '1-0', 'moderate'),
      m('claude-r32-8', '2026-06-30', 'r32', 'Netherlands', 'Ecuador', 'Netherlands', '2-0', 'high'),
      m('claude-r32-9', '2026-06-30', 'r32', 'Belgium', 'Uruguay', 'Belgium', '2-1', 'moderate'),
      m('claude-r32-10', '2026-07-01', 'r32', 'Spain', 'Uzbekistan', 'Spain', '3-0', 'high'),
      m('claude-r32-11', '2026-07-01', 'r32', 'France', 'Austria', 'France', '3-1', 'high'),
      m('claude-r32-12', '2026-07-01', 'r32', 'Norway', 'Bosnia & Herzegovina', 'Norway', '2-1', 'moderate'),
      m('claude-r32-13', '2026-07-02', 'r32', 'Argentina', 'Egypt', 'Argentina', '2-0', 'high'),
      m('claude-r32-14', '2026-07-02', 'r32', 'Portugal', 'Croatia', 'Portugal', '2-1', 'high'),
      m('claude-r32-15', '2026-07-02', 'r32', 'England', 'Australia', 'England', '3-0', 'high'),
      m('claude-r32-16', '2026-07-03', 'r32', 'Morocco', 'Turkey', 'Morocco', '1-0', 'moderate'),
      m('claude-r16-1', '2026-07-04', 'r16', 'Brazil', 'South Korea', 'Brazil', '2-0', 'high'),
      m('claude-r16-2', '2026-07-04', 'r16', 'Spain', 'Mexico', 'Spain', '2-0', 'high'),
      m('claude-r16-3', '2026-07-05', 'r16', 'France', 'USA', 'France', '2-1', 'high'),
      m('claude-r16-4', '2026-07-05', 'r16', 'Argentina', 'Ivory Coast', 'Argentina', '2-0', 'high'),
      m('claude-r16-5', '2026-07-06', 'r16', 'England', 'Belgium', 'England', '2-1', 'moderate'),
      m('claude-r16-6', '2026-07-06', 'r16', 'Germany', 'Morocco', 'Germany', '2-1', 'moderate'),
      m('claude-r16-7', '2026-07-07', 'r16', 'Portugal', 'Norway', 'Portugal', '2-1', 'high'),
      m('claude-r16-8', '2026-07-07', 'r16', 'Netherlands', 'Switzerland', 'Netherlands', '2-1', 'high'),
      m('claude-qf-1', '2026-07-09', 'qf', 'Brazil', 'Spain', 'Spain', '1-0 AET', 'moderate'),
      m('claude-qf-2', '2026-07-09', 'qf', 'France', 'Argentina', 'France', '2-1', 'moderate'),
      m('claude-qf-3', '2026-07-10', 'qf', 'England', 'Germany', 'England', '2-1', 'moderate'),
      m('claude-qf-4', '2026-07-11', 'qf', 'Portugal', 'Netherlands', 'Portugal', '3-2', 'moderate'),
      m('claude-sf-1', '2026-07-14', 'sf', 'Spain', 'England', 'Spain', '2-1', 'moderate'),
      m('claude-sf-2', '2026-07-15', 'sf', 'France', 'Portugal', 'France', '2-1 AET', 'moderate'),
      m('claude-bronze', '2026-07-18', 'bronze', 'England', 'Portugal', 'England', '2-1', 'moderate'),
      m('claude-final', '2026-07-19', 'final', 'Spain', 'France', 'Spain', '2-1 AET', 'moderate'),
    ],
  },
  {
    id: 'gpt',
    label: 'GPT',
    generatedAt: '2026-06-13',
    champion: { team: 'France', score: '3-2 AET', vs: 'Argentina', confidence: 'moderate', confidencePct: 62 },
    winnerProbabilities: [
      { team: 'France', pct: 24 },
      { team: 'Argentina', pct: 21 },
      { team: 'Brazil', pct: 18 },
      { team: 'England', pct: 12 },
      { team: 'Spain', pct: 11 },
      { team: 'Germany', pct: 8 },
      { team: 'Portugal', pct: 4 },
      { team: 'Rest', pct: 2 },
    ],
    groups: SHARED_GROUPS,
    bestThirdPlace: ['Czechia', 'Bosnia & Herzegovina', 'Scotland', 'Australia', 'Ecuador', 'Sweden', 'Egypt', 'Senegal'],
    matches: [
      m('gpt-r32-1', '2026-06-28', 'r32', 'Mexico', 'Scotland', 'Mexico', '2-1', 'high'),
      m('gpt-r32-2', '2026-06-28', 'r32', 'South Korea', 'Canada', 'Canada', '1-0', 'moderate'),
      m('gpt-r32-3', '2026-06-28', 'r32', 'Switzerland', 'Sweden', 'Switzerland', '1-0', 'high'),
      m('gpt-r32-4', '2026-06-29', 'r32', 'Brazil', 'Senegal', 'Brazil', '3-1', 'high'),
      m('gpt-r32-5', '2026-06-29', 'r32', 'USA', 'Ghana', 'USA', '2-1', 'moderate'),
      m('gpt-r32-6', '2026-06-29', 'r32', 'Germany', 'Japan', 'Germany', '2-0', 'high'),
      m('gpt-r32-7', '2026-06-30', 'r32', 'Ivory Coast', 'Algeria', 'Ivory Coast', '2-1', 'moderate'),
      m('gpt-r32-8', '2026-06-30', 'r32', 'Netherlands', 'Ecuador', 'Netherlands', '2-0', 'high'),
      m('gpt-r32-9', '2026-06-30', 'r32', 'Belgium', 'Australia', 'Belgium', '2-1', 'moderate'),
      m('gpt-r32-10', '2026-07-01', 'r32', 'Spain', 'Uzbekistan', 'Spain', '3-0', 'high'),
      m('gpt-r32-11', '2026-07-01', 'r32', 'France', 'Austria', 'France', '2-0', 'high'),
      m('gpt-r32-12', '2026-07-01', 'r32', 'Norway', 'Bosnia & Herzegovina', 'Norway', '1-0', 'moderate'),
      m('gpt-r32-13', '2026-07-02', 'r32', 'Argentina', 'Egypt', 'Argentina', '2-0', 'high'),
      m('gpt-r32-14', '2026-07-02', 'r32', 'Portugal', 'Croatia', 'Portugal', '1-0', 'moderate'),
      m('gpt-r32-15', '2026-07-02', 'r32', 'England', 'Czechia', 'England', '3-1', 'high'),
      m('gpt-r32-16', '2026-07-03', 'r32', 'Morocco', 'Turkey', 'Morocco', '2-1', 'moderate'),
      m('gpt-r16-1', '2026-07-04', 'r16', 'Brazil', 'Canada', 'Brazil', '2-0', 'high'),
      m('gpt-r16-2', '2026-07-04', 'r16', 'France', 'USA', 'France', '3-1', 'high'),
      m('gpt-r16-3', '2026-07-05', 'r16', 'Argentina', 'Morocco', 'Argentina', '2-1', 'moderate'),
      m('gpt-r16-4', '2026-07-05', 'r16', 'England', 'Netherlands', 'England', '2-1', 'moderate'),
      m('gpt-r16-5', '2026-07-06', 'r16', 'Spain', 'Switzerland', 'Spain', '2-0', 'high'),
      m('gpt-r16-6', '2026-07-06', 'r16', 'Germany', 'Belgium', 'Germany', '2-1', 'moderate'),
      m('gpt-r16-7', '2026-07-07', 'r16', 'Portugal', 'Norway', 'Portugal', '2-0', 'high'),
      m('gpt-r16-8', '2026-07-07', 'r16', 'Mexico', 'Ivory Coast', 'Mexico', '1-0', 'low'),
      m('gpt-qf-1', '2026-07-09', 'qf', 'Brazil', 'Spain', 'Brazil', '2-1', 'moderate'),
      m('gpt-qf-2', '2026-07-09', 'qf', 'France', 'England', 'France', '2-1', 'moderate'),
      m('gpt-qf-3', '2026-07-10', 'qf', 'Argentina', 'Germany', 'Argentina', '1-0', 'moderate'),
      m('gpt-qf-4', '2026-07-11', 'qf', 'Portugal', 'Mexico', 'Portugal', '2-0', 'high'),
      m('gpt-sf-1', '2026-07-14', 'sf', 'Brazil', 'France', 'France', '2-1', 'moderate'),
      m('gpt-sf-2', '2026-07-15', 'sf', 'Argentina', 'Portugal', 'Argentina', '2-1 AET', 'moderate'),
      m('gpt-bronze', '2026-07-18', 'bronze', 'Portugal', 'Germany', 'Portugal', '3-2', 'moderate'),
      m('gpt-final', '2026-07-19', 'final', 'France', 'Argentina', 'France', '3-2 AET', 'moderate'),
    ],
  },
  {
    id: 'gemini',
    label: 'Gemini',
    generatedAt: '2026-06-13',
    champion: { team: 'Brazil', score: '3-1', vs: 'England', confidence: 'moderate', confidencePct: 58 },
    winnerProbabilities: [
      { team: 'Brazil', pct: 23 },
      { team: 'England', pct: 18 },
      { team: 'Argentina', pct: 17 },
      { team: 'France', pct: 16 },
      { team: 'Spain', pct: 12 },
      { team: 'Germany', pct: 7 },
      { team: 'Portugal', pct: 4 },
      { team: 'Rest', pct: 3 },
    ],
    groups: SHARED_GROUPS,
    bestThirdPlace: ['Scotland', 'Bosnia & Herzegovina', 'Australia', 'Ecuador', 'Sweden', 'Egypt', 'Senegal', 'Algeria'],
    matches: [
      m('gemini-r32-1', '2026-06-28', 'r32', 'Mexico', 'Scotland', 'Mexico', '1-0', 'high'),
      m('gemini-r32-2', '2026-06-28', 'r32', 'South Korea', 'Canada', 'South Korea', '2-1', 'moderate'),
      m('gemini-r32-3', '2026-06-28', 'r32', 'Switzerland', 'Algeria', 'Switzerland', '2-0', 'high'),
      m('gemini-r32-4', '2026-06-29', 'r32', 'Brazil', 'Senegal', 'Brazil', '2-0', 'high'),
      m('gemini-r32-5', '2026-06-29', 'r32', 'USA', 'Ghana', 'USA', '3-1', 'high'),
      m('gemini-r32-6', '2026-06-29', 'r32', 'Germany', 'Japan', 'Japan', '2-1', 'low'),
      m('gemini-r32-7', '2026-06-30', 'r32', 'Ivory Coast', 'Ecuador', 'Ivory Coast', '1-0', 'moderate'),
      m('gemini-r32-8', '2026-06-30', 'r32', 'Netherlands', 'Sweden', 'Netherlands', '3-1', 'high'),
      m('gemini-r32-9', '2026-06-30', 'r32', 'Belgium', 'Uruguay', 'Belgium', '2-1', 'moderate'),
      m('gemini-r32-10', '2026-07-01', 'r32', 'Spain', 'Uzbekistan', 'Spain', '4-0', 'high'),
      m('gemini-r32-11', '2026-07-01', 'r32', 'France', 'Austria', 'France', '3-0', 'high'),
      m('gemini-r32-12', '2026-07-01', 'r32', 'Norway', 'Bosnia & Herzegovina', 'Norway', '2-1', 'moderate'),
      m('gemini-r32-13', '2026-07-02', 'r32', 'Argentina', 'Egypt', 'Argentina', '2-0', 'high'),
      m('gemini-r32-14', '2026-07-02', 'r32', 'Portugal', 'Croatia', 'Portugal', '2-1', 'high'),
      m('gemini-r32-15', '2026-07-02', 'r32', 'England', 'Australia', 'England', '2-0', 'high'),
      m('gemini-r32-16', '2026-07-03', 'r32', 'Morocco', 'Turkey', 'Morocco', '1-0', 'moderate'),
      m('gemini-r16-1', '2026-07-04', 'r16', 'Brazil', 'South Korea', 'Brazil', '3-1', 'high'),
      m('gemini-r16-2', '2026-07-04', 'r16', 'Spain', 'Mexico', 'Spain', '2-0', 'high'),
      m('gemini-r16-3', '2026-07-05', 'r16', 'France', 'USA', 'France', '2-1', 'high'),
      m('gemini-r16-4', '2026-07-05', 'r16', 'Argentina', 'Ivory Coast', 'Argentina', '2-0', 'high'),
      m('gemini-r16-5', '2026-07-06', 'r16', 'England', 'Belgium', 'England', '1-0', 'moderate'),
      m('gemini-r16-6', '2026-07-06', 'r16', 'Japan', 'Uruguay', 'Japan', '2-1 AET', 'low'),
      m('gemini-r16-7', '2026-07-07', 'r16', 'Portugal', 'Norway', 'Portugal', '2-1', 'moderate'),
      m('gemini-r16-8', '2026-07-07', 'r16', 'Netherlands', 'Switzerland', 'Netherlands', '2-1', 'moderate'),
      m('gemini-qf-1', '2026-07-09', 'qf', 'Brazil', 'Spain', 'Brazil', '2-1', 'moderate'),
      m('gemini-qf-2', '2026-07-09', 'qf', 'France', 'Argentina', 'Argentina', '1-0', 'moderate'),
      m('gemini-qf-3', '2026-07-10', 'qf', 'England', 'Japan', 'England', '3-1', 'high'),
      m('gemini-qf-4', '2026-07-11', 'qf', 'Portugal', 'Netherlands', 'Portugal', '2-1 AET', 'moderate'),
      m('gemini-sf-1', '2026-07-14', 'sf', 'Brazil', 'Argentina', 'Brazil', '2-1', 'moderate'),
      m('gemini-sf-2', '2026-07-15', 'sf', 'England', 'Portugal', 'England', '2-0', 'high'),
      m('gemini-bronze', '2026-07-18', 'bronze', 'Portugal', 'Argentina', 'Portugal', '2-1', 'moderate'),
      m('gemini-final', '2026-07-19', 'final', 'Brazil', 'England', 'Brazil', '3-1', 'moderate'),
    ],
  },
];

export function getStageForDate(date: string): string {
  for (const [key, { start, end }] of Object.entries(STAGE_DATES)) {
    if (date >= start && date <= end) return key;
  }
  return 'off';
}

export function getMatchesForDate(model: ModelPrediction, date: string): MatchPrediction[] {
  return model.matches.filter((match) => match.date === date);
}

export function computeAccuracy(model: ModelPrediction, actuals: ActualResult[]) {
  const resolved = model.matches
    .map((match) => {
      const actual = actuals.find((a) => a.matchId === match.id);
      if (!actual) return null;
      return {
        match,
        correct: actual.actualWinner === match.predictedWinner,
        actual,
      };
    })
    .filter(Boolean) as { match: MatchPrediction; correct: boolean; actual: ActualResult }[];

  const total = resolved.length;
  const correct = resolved.filter((r) => r.correct).length;
  return {
    total,
    correct,
    pct: total > 0 ? Math.round((correct / total) * 100) : null,
    resolved,
  };
}
