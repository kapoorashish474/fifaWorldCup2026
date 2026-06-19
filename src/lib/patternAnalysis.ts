import { GROUP_FIXTURES } from '../data/groupSchedule';
import { FIFA_RANKINGS } from './predictionEngine';
import { lookupResult, type EspnResult } from './espnResults';

export const RIVALRY_LABELS: Record<string, string> = {
  'Argentina-Brazil': 'Superclásico',
  'Argentina-England': 'Historic rivalry',
  'Argentina-Germany': 'WC Finals history',
  'Brazil-Germany': '7-1 revenge',
  'Spain-Portugal': 'Iberian Derby',
  'Netherlands-Germany': 'Classic rivalry',
  'England-Germany': 'Historic rivalry',
  'France-Italy': 'WC 2006 Final',
  'USA-Mexico': 'CONCACAF rivalry',
  'Japan-South Korea': 'East Asian rivalry',
  'Uruguay-Argentina': 'Río de la Plata',
  'Colombia-Brazil': 'South American clash',
  'France-Germany': 'Franco-German rivalry',
  'England-France': 'Cross-Channel rivalry',
  'Morocco-Spain': 'Mediterranean derby',
  'Mexico-Brazil': 'Americas heavyweight',
};

export interface FamousRivalry {
  teamA: string;
  teamB: string;
  name: string;
  region: string;
  story: string;
  wc2026: boolean;
  intensity: 'legendary' | 'major' | 'regional';
}

const WC2026_TEAMS = new Set(
  GROUP_FIXTURES.flatMap((f) => [f.teamA, f.teamB]),
);

export const FAMOUS_RIVALRIES: FamousRivalry[] = [
  {
    teamA: 'Argentina', teamB: 'Brazil', name: 'Superclásico of the Americas',
    region: 'South America', intensity: 'legendary',
    story: 'The fiercest rivalry in world football — Maradona vs Pelé eras, Copa América drama, and endless WC knockouts.',
    wc2026: true,
  },
  {
    teamA: 'Argentina', teamB: 'Germany', name: 'World Cup Final trilogy',
    region: 'Global', intensity: 'legendary',
    story: '1986 Maradona glory, 1990 German revenge, 2014 Extra time heartbreak in Rio.',
    wc2026: true,
  },
  {
    teamA: 'Brazil', teamB: 'Germany', name: 'Mineirazo',
    region: 'Global', intensity: 'legendary',
    story: 'Seven goals in Belo Horizonte 2014 — the most shocking scoreline in WC history.',
    wc2026: true,
  },
  {
    teamA: 'England', teamB: 'Germany', name: 'Three Lions vs Die Mannschaft',
    region: 'Europe', intensity: 'legendary',
    story: '1966 final, 1990 penalties, 2010 ghost goal — decades of knockout tension.',
    wc2026: true,
  },
  {
    teamA: 'Argentina', teamB: 'England', name: 'Hand of God & beyond',
    region: 'Global', intensity: 'legendary',
    story: '1986 quarter-final defined a generation — Maradona\'s dual masterpiece and English heartbreak.',
    wc2026: false,
  },
  {
    teamA: 'Spain', teamB: 'Portugal', name: 'Iberian Derby',
    region: 'Europe', intensity: 'major',
    story: 'Euro 2012 semi-final classic — Ronaldo vs tiki-taka, neighbors with everything to prove.',
    wc2026: true,
  },
  {
    teamA: 'Netherlands', teamB: 'Germany', name: 'Total Football vs Machine',
    region: 'Europe', intensity: 'major',
    story: '1974 Cruyff vs Beckenbauer, 1988 Euro revenge — contrasting football philosophies.',
    wc2026: true,
  },
  {
    teamA: 'France', teamB: 'Germany', name: 'Franco-German rivalry',
    region: 'Europe', intensity: 'major',
    story: 'Seville 1982, semi-finals galore — two European powers with deep WC history.',
    wc2026: true,
  },
  {
    teamA: 'France', teamB: 'Italy', name: 'Zidane\'s final bow',
    region: 'Europe', intensity: 'legendary',
    story: '2006 Berlin final — Materazzi, headbutt, penalties. Pure theatre.',
    wc2026: false,
  },
  {
    teamA: 'USA', teamB: 'Mexico', name: 'CONCACAF grudge match',
    region: 'North America', intensity: 'major',
    story: 'Dos a Cero, Azteca atmosphere, co-host tension — the rivalry that defines the region.',
    wc2026: true,
  },
  {
    teamA: 'Japan', teamB: 'South Korea', name: 'East Asian derby',
    region: 'Asia', intensity: 'regional',
    story: '2002 co-hosted WC, political history, fierce pride — every meeting is a event.',
    wc2026: true,
  },
  {
    teamA: 'Uruguay', teamB: 'Argentina', name: 'Río de la Plata',
    region: 'South America', intensity: 'major',
    story: 'First World Cup winners vs modern giants — physical, passionate, never friendly.',
    wc2026: true,
  },
  {
    teamA: 'Colombia', teamB: 'Brazil', name: 'James vs Neymar era',
    region: 'South America', intensity: 'regional',
    story: '2014 quarter-final heartbreak for Brazil — Colombia\'s golden generation pushed the favorites.',
    wc2026: true,
  },
  {
    teamA: 'England', teamB: 'France', name: 'Cross-Channel rivalry',
    region: 'Europe', intensity: 'major',
    story: 'Euro 84, Euro 92, Euro 2012 — knockout specialists vs tournament underachievers.',
    wc2026: true,
  },
  {
    teamA: 'Morocco', teamB: 'Spain', name: 'Mediterranean neighbors',
    region: 'Africa/Europe', intensity: 'regional',
    story: '2022 Qatar semi-final shock — Morocco stunned Spain on penalties before the world took notice.',
    wc2026: true,
  },
  {
    teamA: 'Mexico', teamB: 'Brazil', name: 'Americas heavyweight clash',
    region: 'Americas', intensity: 'regional',
    story: 'Confederations Cup finals, group stage thrillers — Latin flair meets samba.',
    wc2026: true,
  },
  {
    teamA: 'Germany', teamB: 'Italy', name: 'European elite',
    region: 'Europe', intensity: 'legendary',
    story: '2006 semi shootout, 2012 Euro semi — two tactical masters, always tight.',
    wc2026: false,
  },
  {
    teamA: 'Portugal', teamB: 'Netherlands', name: 'Total Football clashes',
    region: 'Europe', intensity: 'regional',
    story: '2006 WC and 2012 Euro — orange vs red-green, always open and aggressive.',
    wc2026: true,
  },
].map((r): FamousRivalry => ({
  teamA: r.teamA,
  teamB: r.teamB,
  name: r.name,
  region: r.region,
  story: r.story,
  intensity: r.intensity as FamousRivalry['intensity'],
  wc2026: WC2026_TEAMS.has(r.teamA) && WC2026_TEAMS.has(r.teamB),
}));

const HOST_NATIONS = new Set(['USA', 'Mexico', 'Canada']);
const MEGA_DRAW = new Set([
  'Brazil', 'Argentina', 'France', 'England', 'Germany', 'Spain',
  'Portugal', 'Netherlands', 'USA', 'Mexico',
]);

export type TimeSlot = 'early' | 'afternoon' | 'primetime' | 'late';
export type Trend = 'high' | 'avg' | 'low';

export interface CompletedMatch {
  id: string;
  kickoff: string;
  teamA: string;
  teamB: string;
  venue?: string;
  totalGoals: number;
  timeSlot: TimeSlot;
  isWeekend: boolean;
  hasHostNation: boolean;
  megaDrawCount: number;
  viewershipScore: number;
  isRivalry: boolean;
  rivalryLabel?: string;
  rankingGap: number;
  hostCountry: 'USA' | 'Mexico' | 'Canada' | 'Other';
}

export interface UpcomingPatternPick {
  id: string;
  kickoff: string;
  teamA: string;
  teamB: string;
  venue?: string;
  timeSlot: TimeSlot;
  predictedGoals: number;
  entertainmentScore: number;
  signals: string[];
}

export interface TimeSlotRating {
  slot: TimeSlot;
  shortLabel: string;
  window: string;
  completedMatches: number;
  scheduledMatches: number;
  avgGoals: number | null;
  avgViewership: number;
  rating: number;
  trend: Trend;
}

export interface CalendarCompare {
  weekend: { completed: number; avgGoals: number | null; avgViewership: number };
  weekday: { completed: number; avgGoals: number | null; avgViewership: number };
  verdict: string;
  goalsLeader: 'weekend' | 'weekday' | 'even';
  viewLeader: 'weekend' | 'weekday' | 'even';
}

export interface PatternAnalysis {
  sampleSize: number;
  tournamentAvgGoals: number;
  timeSlotRatings: TimeSlotRating[];
  calendarCompare: CalendarCompare;
  upcoming: UpcomingPatternPick[];
}

function rivalryKey(a: string, b: string): string {
  return [a, b].sort().join('-');
}

function parseGoals(score: string): number {
  const [a, b] = score.split('–').map((s) => parseInt(s, 10) || 0);
  return a + b;
}

/** Eastern Time hour for kickoff (US primetime proxy for TV viewership). */
function easternHour(iso: string): number {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(d);
  return parseInt(parts.find((p) => p.type === 'hour')?.value ?? '12', 10);
}

export function getTimeSlot(kickoff: string): TimeSlot {
  const h = easternHour(kickoff);
  if (h < 14) return 'early';
  if (h < 18) return 'afternoon';
  if (h < 22) return 'primetime';
  return 'late';
}

export function timeSlotLabel(slot: TimeSlot): string {
  return {
    early: 'Early (before 2 PM ET)',
    afternoon: 'Afternoon (2–6 PM ET)',
    primetime: 'Primetime (6–10 PM ET)',
    late: 'Late night (10 PM+ ET)',
  }[slot];
}

export function timeSlotShortLabel(slot: TimeSlot): string {
  return {
    early: 'Early',
    afternoon: 'Afternoon',
    primetime: 'Primetime',
    late: 'Late night',
  }[slot];
}

export function timeSlotWindow(slot: TimeSlot): string {
  return {
    early: 'Before 2p ET',
    afternoon: '2–6p ET',
    primetime: '6–10p ET',
    late: '10p+ ET',
  }[slot];
}

function isWeekendKickoff(kickoff: string): boolean {
  const day = new Date(kickoff).getUTCDay();
  return day === 0 || day === 6;
}

function viewershipScore(teamA: string, teamB: string): { score: number; megaDrawCount: number } {
  let megaDrawCount = 0;
  if (MEGA_DRAW.has(teamA)) megaDrawCount++;
  if (MEGA_DRAW.has(teamB)) megaDrawCount++;
  const hostBoost = HOST_NATIONS.has(teamA) || HOST_NATIONS.has(teamB) ? 1.5 : 0;
  const rivalryBoost = RIVALRY_LABELS[rivalryKey(teamA, teamB)] ? 1 : 0;
  return { score: megaDrawCount * 1.2 + hostBoost + rivalryBoost, megaDrawCount };
}

function hostCountryFromVenue(venue?: string): CompletedMatch['hostCountry'] {
  if (!venue) return 'Other';
  if (venue.includes('Mexico')) return 'Mexico';
  if (venue.includes('Canada')) return 'Canada';
  if (venue.includes('USA')) return 'USA';
  return 'Other';
}

function rankingGap(teamA: string, teamB: string): number {
  const rankA = FIFA_RANKINGS[teamA] ?? 50;
  const rankB = FIFA_RANKINGS[teamB] ?? 50;
  return Math.abs(rankA - rankB);
}

function bucketTrend(avg: number, baseline: number): Trend {
  if (avg >= baseline + 0.35) return 'high';
  if (avg <= baseline - 0.35) return 'low';
  return 'avg';
}

function buildCompleted(
  byId: Map<string, EspnResult>,
  byTeams: Map<string, EspnResult>,
): CompletedMatch[] {
  const out: CompletedMatch[] = [];

  for (const fix of GROUP_FIXTURES) {
    const result = lookupResult(fix.id, fix.teamA, fix.teamB, byId, byTeams);
    if (!result || result.state !== 'post') continue;

    const rKey = rivalryKey(fix.teamA, fix.teamB);
    const { score, megaDrawCount } = viewershipScore(fix.teamA, fix.teamB);

    out.push({
      id: fix.id,
      kickoff: fix.kickoff,
      teamA: fix.teamA,
      teamB: fix.teamB,
      venue: fix.venue,
      totalGoals: parseGoals(result.score),
      timeSlot: getTimeSlot(fix.kickoff),
      isWeekend: isWeekendKickoff(fix.kickoff),
      hasHostNation: HOST_NATIONS.has(fix.teamA) || HOST_NATIONS.has(fix.teamB),
      megaDrawCount,
      viewershipScore: score,
      isRivalry: !!RIVALRY_LABELS[rKey],
      rivalryLabel: RIVALRY_LABELS[rKey],
      rankingGap: rankingGap(fix.teamA, fix.teamB),
      hostCountry: hostCountryFromVenue(fix.venue),
    });
  }

  return out;
}

function predictUpcoming(
  completed: CompletedMatch[],
  byId: Map<string, EspnResult>,
  byTeams: Map<string, EspnResult>,
  baseline: number,
): UpcomingPatternPick[] {
  const slotAvgs = new Map<TimeSlot, number>();
  for (const slot of ['early', 'afternoon', 'primetime', 'late'] as TimeSlot[]) {
    const bucket = completed.filter((m) => m.timeSlot === slot);
    slotAvgs.set(
      slot,
      bucket.length ? bucket.reduce((s, m) => s + m.totalGoals, 0) / bucket.length : baseline,
    );
  }

  const megaAvg =
    completed.filter((m) => m.megaDrawCount >= 1).reduce((s, m) => s + m.totalGoals, 0) /
      (completed.filter((m) => m.megaDrawCount >= 1).length || 1);
  const standardAvg =
    completed.filter((m) => m.megaDrawCount === 0).reduce((s, m) => s + m.totalGoals, 0) /
      (completed.filter((m) => m.megaDrawCount === 0).length || 1);

  const rivalryAvg =
    completed.filter((m) => m.isRivalry).reduce((s, m) => s + m.totalGoals, 0) /
      (completed.filter((m) => m.isRivalry).length || 1);

  const upcoming: UpcomingPatternPick[] = [];

  for (const fix of GROUP_FIXTURES) {
    const result = lookupResult(fix.id, fix.teamA, fix.teamB, byId, byTeams);
    if (result?.state === 'post') continue;

    const slot = getTimeSlot(fix.kickoff);
    const rKey = rivalryKey(fix.teamA, fix.teamB);
    const { score, megaDrawCount } = viewershipScore(fix.teamA, fix.teamB);
    const gap = rankingGap(fix.teamA, fix.teamB);
    const signals: string[] = [];
    let predicted = baseline || 2.5;

    const slotAvg = slotAvgs.get(slot) ?? baseline;
    if (slotAvg > baseline + 0.2) {
      predicted += 0.35;
      signals.push(timeSlotLabel(slot));
    } else if (slotAvg < baseline - 0.2) {
      predicted -= 0.25;
      signals.push(`Quieter ${timeSlotLabel(slot).split('(')[0].trim()} slot`);
    }

    if (megaDrawCount >= 2) {
      predicted += 0.5;
      signals.push('Double mega-draw');
    } else if (megaDrawCount === 1) {
      predicted += megaAvg > standardAvg ? 0.35 : 0.15;
      signals.push('Star nation on show');
    }

    if (RIVALRY_LABELS[rKey]) {
      predicted += rivalryAvg > baseline ? 0.4 : 0.2;
      signals.push(RIVALRY_LABELS[rKey]);
    }

    if (HOST_NATIONS.has(fix.teamA) || HOST_NATIONS.has(fix.teamB)) {
      predicted += 0.25;
      signals.push('Host nation boost');
    }

    if (isWeekendKickoff(fix.kickoff)) {
      predicted += 0.15;
      signals.push('Weekend kickoff');
    }

    if (gap <= 8) {
      predicted += 0.2;
      signals.push('Evenly matched (FIFA rank)');
    } else if (gap >= 20) {
      predicted += 0.15;
      signals.push('Ranking mismatch — upset or rout potential');
    }

    const entertainmentScore = Math.min(
      99,
      Math.round(
        40 +
          score * 12 +
          (predicted - baseline) * 15 +
          (signals.length * 4),
      ),
    );

    upcoming.push({
      id: fix.id,
      kickoff: fix.kickoff,
      teamA: fix.teamA,
      teamB: fix.teamB,
      venue: fix.venue,
      timeSlot: slot,
      predictedGoals: Math.round(predicted * 10) / 10,
      entertainmentScore,
      signals: signals.length ? signals : ['Baseline expectation'],
    });
  }

  return upcoming
    .sort((a, b) => b.entertainmentScore - a.entertainmentScore)
    .slice(0, 8);
}

function avgViewershipForFixtures(fixtures: { teamA: string; teamB: string }[]): number {
  if (fixtures.length === 0) return 0;
  const sum = fixtures.reduce((s, f) => s + viewershipScore(f.teamA, f.teamB).score, 0);
  return Math.round((sum / fixtures.length) * 10) / 10;
}

function buildTimeSlotRatings(completed: CompletedMatch[], baseline: number): TimeSlotRating[] {
  const slots: TimeSlot[] = ['early', 'afternoon', 'primetime', 'late'];

  const scheduledBySlot = new Map<TimeSlot, typeof GROUP_FIXTURES>();
  for (const slot of slots) scheduledBySlot.set(slot, []);
  for (const fix of GROUP_FIXTURES) {
    scheduledBySlot.get(getTimeSlot(fix.kickoff))!.push(fix);
  }

  const maxView = Math.max(
    ...slots.map((slot) => avgViewershipForFixtures(scheduledBySlot.get(slot)!)),
    0.1,
  );

  return slots
    .map((slot) => {
      const done = completed.filter((m) => m.timeSlot === slot);
      const scheduled = scheduledBySlot.get(slot)!;
      const avgGoals = done.length
        ? Math.round((done.reduce((s, m) => s + m.totalGoals, 0) / done.length) * 100) / 100
        : null;
      const avgViewership = avgViewershipForFixtures(scheduled);
      const goalNorm = avgGoals != null && baseline > 0 ? Math.min(1, avgGoals / (baseline * 1.4)) : 0.5;
      const viewNorm = avgViewership / maxView;
      const rating = Math.round(
        (done.length > 0 ? goalNorm * 55 + viewNorm * 45 : viewNorm * 100),
      );

      return {
        slot,
        shortLabel: timeSlotShortLabel(slot),
        window: timeSlotWindow(slot),
        completedMatches: done.length,
        scheduledMatches: scheduled.length,
        avgGoals,
        avgViewership,
        rating,
        trend: avgGoals != null ? bucketTrend(avgGoals, baseline) : (viewNorm >= 0.85 ? 'high' : viewNorm <= 0.5 ? 'low' : 'avg'),
      };
    })
    .sort((a, b) => b.rating - a.rating);
}

function buildCalendarCompare(completed: CompletedMatch[]): CalendarCompare {
  const weekendDone = completed.filter((m) => m.isWeekend);
  const weekdayDone = completed.filter((m) => !m.isWeekend);

  const weekendScheduled = GROUP_FIXTURES.filter((f) => isWeekendKickoff(f.kickoff));
  const weekdayScheduled = GROUP_FIXTURES.filter((f) => !isWeekendKickoff(f.kickoff));

  const wGoals = weekendDone.length
    ? weekendDone.reduce((s, m) => s + m.totalGoals, 0) / weekendDone.length
    : null;
  const dGoals = weekdayDone.length
    ? weekdayDone.reduce((s, m) => s + m.totalGoals, 0) / weekdayDone.length
    : null;
  const wView = avgViewershipForFixtures(weekendScheduled);
  const dView = avgViewershipForFixtures(weekdayScheduled);

  const goalsLeader =
    wGoals == null || dGoals == null
      ? 'even'
      : wGoals > dGoals + 0.15
        ? 'weekend'
        : dGoals > wGoals + 0.15
          ? 'weekday'
          : 'even';
  const viewLeader =
    wView > dView + 0.2 ? 'weekend' : dView > wView + 0.2 ? 'weekday' : 'even';

  let verdict = 'Not enough finished matches yet — ratings use scheduled TV-draw strength.';
  if (weekendDone.length >= 2 && weekdayDone.length >= 2) {
    if (goalsLeader === 'weekend' && viewLeader === 'weekend') {
      verdict = 'Weekends win on both goals and TV draw — best window for must-watch football.';
    } else if (goalsLeader === 'weekday' && viewLeader === 'weekday') {
      verdict = 'Weekdays outperform weekends on goals and star-power fixtures so far.';
    } else if (goalsLeader === 'weekend') {
      verdict = 'Weekends score more goals; weekdays still carry strong headline teams.';
    } else if (goalsLeader === 'weekday') {
      verdict = 'Weekdays are more open; weekends still pull bigger TV audiences.';
    } else if (viewLeader === 'weekend') {
      verdict = 'Goal counts are even, but weekends stack the most marquee matchups.';
    } else {
      verdict = 'Weekend and weekday patterns are neck-and-neck in this sample.';
    }
  }

  return {
    weekend: {
      completed: weekendDone.length,
      avgGoals: wGoals != null ? Math.round(wGoals * 100) / 100 : null,
      avgViewership: wView,
    },
    weekday: {
      completed: weekdayDone.length,
      avgGoals: dGoals != null ? Math.round(dGoals * 100) / 100 : null,
      avgViewership: dView,
    },
    verdict,
    goalsLeader,
    viewLeader,
  };
}

export function analyzePatterns(
  byId: Map<string, EspnResult>,
  byTeams: Map<string, EspnResult>,
): PatternAnalysis {
  const completed = buildCompleted(byId, byTeams);
  const sampleSize = completed.length;
  const tournamentAvgGoals = sampleSize
    ? Math.round((completed.reduce((s, m) => s + m.totalGoals, 0) / sampleSize) * 100) / 100
    : 0;

  const timeSlotRatings = buildTimeSlotRatings(completed, tournamentAvgGoals);
  const calendarCompare = buildCalendarCompare(completed);
  const upcoming = predictUpcoming(completed, byId, byTeams, tournamentAvgGoals);

  return {
    sampleSize,
    tournamentAvgGoals,
    timeSlotRatings,
    calendarCompare,
    upcoming,
  };
}
