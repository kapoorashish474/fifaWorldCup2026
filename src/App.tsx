import { useCallback, useMemo, useState } from 'react';
import {
  ALL_DATES,
  ALL_STAGES,
  ALL_TEAMS,
  GROUP_LETTERS,
  MODELS,
  pctClass,
  slotKey,
  type MatchPrediction,
  type ModelPrediction,
  type ScheduleStage,
} from './data/predictions';
import { GROUP_FIXTURES } from './data/groupSchedule';
import {
  accuracyPct,
  computeModelAccuracy,
  espnIdFromMatchId,
  lookupResult,
  predictionCorrect,
  resolveTiming,
  teamsKey,
  type EspnResult,
  type ModelAccuracy,
} from './lib/espnResults';
import {
  fmtCountdown,
  fmtKickoff,
  localDateKey,
  msUntilKickoff,
  type MatchTiming,
} from './lib/matchTime';
import { NAV_TABS, TAB_LABELS, TAB_PATHS } from './lib/routes';
import { useEspnResults, useNow } from './lib/useScheduleClock';
import { usePathTab } from './lib/usePathTab';
import { useBets } from './lib/useBets';
import { useDynamicFactors } from './hooks/useDynamicFactors';
import type { MatchDynamicFactors } from './lib/dynamicFactors';
import { useLearning } from './lib/useLearning';
import { FIFA_RANKINGS, WORLD_CUP_TITLES, RECENT_FORM } from './lib/predictionEngine';
import { Dropdown, type DropdownOption } from './components/Dropdown';
import { analyzePatterns, FAMOUS_RIVALRIES, getTimeSlot, type PatternBucket, type TimeSlot } from './lib/patternAnalysis';

// Classic rivalries
const RIVALRIES: Record<string, string> = {
  'Argentina-Brazil': 'Superclásico', 'Argentina-England': 'Historic rivalry',
  'Argentina-Germany': 'WC Finals history', 'Brazil-Germany': '7-1 revenge',
  'Spain-Portugal': 'Iberian Derby', 'Netherlands-Germany': 'Classic rivalry',
  'England-Germany': 'Historic rivalry', 'France-Italy': 'WC 2006 Final',
  'USA-Mexico': 'CONCACAF rivalry', 'Japan-South Korea': 'East Asian rivalry',
};

// Unique locations/cities from venues
const ALL_LOCATIONS = [...new Set(
  GROUP_FIXTURES
    .map(f => f.venue?.split(' · ')[1]?.trim())
    .filter((v): v is string => !!v)
)].sort();

// Country codes for flag images
const COUNTRY_FLAGS: Record<string, string> = {
  'Argentina': 'ar', 'Australia': 'au', 'Austria': 'at', 'Algeria': 'dz',
  'Belgium': 'be', 'Bosnia & Herzegovina': 'ba', 'Brazil': 'br',
  'Cameroon': 'cm', 'Canada': 'ca', 'Cape Verde': 'cv', 'Chile': 'cl',
  'Colombia': 'co', 'Costa Rica': 'cr', 'Croatia': 'hr', 'Czechia': 'cz',
  'Denmark': 'dk', 'DR Congo': 'cd', 'Ecuador': 'ec', 'Egypt': 'eg',
  'England': 'gb-eng', 'France': 'fr', 'Germany': 'de', 'Ghana': 'gh',
  'Haiti': 'ht', 'Iceland': 'is', 'Iran': 'ir', 'Italy': 'it',
  'Ivory Coast': 'ci', 'Jamaica': 'jm', 'Japan': 'jp', 'Mexico': 'mx',
  'Morocco': 'ma', 'Netherlands': 'nl', 'New Zealand': 'nz', 'Nigeria': 'ng',
  'Norway': 'no', 'Panama': 'pa', 'Paraguay': 'py', 'Peru': 'pe',
  'Poland': 'pl', 'Portugal': 'pt', 'Qatar': 'qa', 'Saudi Arabia': 'sa',
  'Scotland': 'gb-sct', 'Senegal': 'sn', 'Serbia': 'rs', 'Slovenia': 'si',
  'South Africa': 'za', 'South Korea': 'kr', 'Spain': 'es', 'Sweden': 'se',
  'Switzerland': 'ch', 'Tunisia': 'tn', 'Turkey': 'tr', 'Ukraine': 'ua',
  'Uruguay': 'uy', 'USA': 'us', 'Uzbekistan': 'uz', 'Venezuela': 've', 'Wales': 'gb-wls',
};

function TeamFlag({ team, size = 24 }: { team: string; size?: number }) {
  const code = COUNTRY_FLAGS[team] || 'un';
  return (
    <img
      src={`https://flagcdn.com/w${size * 2}/${code}.png`}
      alt={team}
      title={team}
      className="team-flag"
      style={{ width: size, height: size * 0.67, objectFit: 'cover', borderRadius: 2 }}
    />
  );
}

function PatternBucketGrid({
  buckets,
  baseline,
  compact = false,
}: {
  buckets: PatternBucket[];
  baseline: number;
  compact?: boolean;
}) {
  return (
    <div className={`pattern-buckets ${compact ? 'compact' : ''}`}>
      {buckets.map((b) => (
        <div key={b.key} className={`pattern-bucket trend-${b.trend}`}>
          <div className="pattern-bucket-head">
            <span className="pattern-bucket-label">{b.label}</span>
            <span className={`pattern-trend-badge ${b.trend}`}>
              {b.trend === 'high' ? '↑ High' : b.trend === 'low' ? '↓ Low' : '≈ Avg'}
            </span>
          </div>
          {!compact && <p className="pattern-bucket-desc">{b.description}</p>}
          <div className="pattern-bucket-stats">
            <span className="pattern-avg">{b.matches > 0 ? b.avgGoals : '—'}</span>
            <span className="pattern-avg-label">goals / match</span>
          </div>
          <div className="pattern-bucket-foot">
            <span>{b.matches} match{b.matches !== 1 ? 'es' : ''}</span>
            {b.matches > 0 && baseline > 0 && (
              <span className={b.deltaFromAvg >= 0 ? 'delta-pos' : 'delta-neg'}>
                {b.deltaFromAvg >= 0 ? '+' : ''}{b.deltaFromAvg} vs avg
              </span>
            )}
          </div>
          {b.matches > 0 && baseline > 0 && (
            <div className="pattern-bar-track">
              <div
                className="pattern-bar-fill"
                style={{ width: `${Math.min(100, (b.avgGoals / (baseline * 2)) * 100)}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface Pick { m: MatchPrediction; md: ModelPrediction }

interface SlotGroup {
  key: string;
  id: string;
  stage: MatchPrediction['stage'];
  kickoff: string;
  slot: number;
  groupLetter?: string;
  espnId?: string;
  venue?: string;
  teamA: string;
  teamB: string;
  picks: Pick[];
}

function formatFactorName(key: string): string {
  const names: Record<string, string> = {
    fifaRanking: 'FIFA Ranking',
    groupPosition: 'Group Position',
    tournamentForm: 'Tournament Form',
    worldCupHistory: 'WC History',
    squadValue: 'Squad Strength',
    recentForm: 'Recent Form',
    homeContinent: 'Home Advantage',
    upsetPotential: 'Upset Factor',
  };
  return names[key] ?? key;
}

function fmtDateOption(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function stageInfo(stage: MatchPrediction['stage']) {
  return ALL_STAGES.find((s) => s.key === stage)!;
}

function StatusBadge({
  timing,
  kickoff,
  now,
  actual,
}: {
  timing: MatchTiming;
  kickoff: string;
  now: number;
  actual?: EspnResult;
}) {
  if (timing === 'finished' && actual) {
    return <span className="timing timing-finished">{actual.score}</span>;
  }
  if (timing === 'live' && actual) {
    return (
      <span className="timing timing-live">
        <i className="live-dot" />
        Live {actual.clock ?? ''} · {actual.score}
      </span>
    );
  }
  if (timing === 'live') {
    return (
      <span className="timing timing-live">
        <i className="live-dot" />
        Live
      </span>
    );
  }
  if (timing === 'upcoming') {
    const countdown = fmtCountdown(msUntilKickoff(kickoff, now));
    return (
      <span className="timing timing-upcoming">
        Upcoming{countdown ? ` · ${countdown}` : ''}
      </span>
    );
  }
  return <span className="timing timing-finished">Finished</span>;
}

function SlotCard({
  group,
  timing,
  now,
  actual,
  aiPrediction,
  dynamicFactors,
}: {
  group: SlotGroup;
  timing: MatchTiming;
  now: number;
  actual?: EspnResult;
  aiPrediction?: ReturnType<typeof import('./lib/predictionEngine').predictMatch>;
  dynamicFactors?: MatchDynamicFactors;
}) {
  const st = stageInfo(group.stage);
  const stageLabel = group.stage === 'group' && group.groupLetter
    ? `Grp ${group.groupLetter}`
    : st.label;

  // Get team data for concise display
  const rankA = FIFA_RANKINGS[group.teamA] ?? 50;
  const rankB = FIFA_RANKINGS[group.teamB] ?? 50;
  const formA = RECENT_FORM[group.teamA] ?? 0;
  const formB = RECENT_FORM[group.teamB] ?? 0;
  const titlesA = WORLD_CUP_TITLES[group.teamA] ?? 0;
  const titlesB = WORLD_CUP_TITLES[group.teamB] ?? 0;
  // Host countries only (not all NA teams)
  const HOST_COUNTRIES = ['USA', 'Mexico', 'Canada'];
  const isHomeA = HOST_COUNTRIES.includes(group.teamA);
  const isHomeB = HOST_COUNTRIES.includes(group.teamB);
  
  // Check for rivalry
  const rivalryKey1 = `${group.teamA}-${group.teamB}`;
  const rivalryKey2 = `${group.teamB}-${group.teamA}`;
  const rivalry = RIVALRIES[rivalryKey1] || RIVALRIES[rivalryKey2];

  // Build uniform factors list
  const rankDiff = Math.abs(rankA - rankB);
  const higherRanked = rankA < rankB ? group.teamA : rankA > rankB ? group.teamB : null;
  const betterForm = formA > formB ? group.teamA : formB > formA ? group.teamB : null;
  
  // All factors with details
  const allFactors = aiPrediction?.factors ?? [];
  const keyFactors = allFactors.filter(f => f.score !== 0);
  const isFinished = actual?.state === 'post';

  return (
    <div className={`match-card timing-${timing}`} style={{ '--stage': st.color } as React.CSSProperties}>
      <div className="match-header">
        <div className="match-top-row">
          <span className="match-stage">{stageLabel}</span>
          <span className="match-teams">
            <span className={`team-a${actual?.winner === group.teamA ? ' winner' : ''}`}>
              {group.teamA} <span className="rank">#{rankA}</span>
            </span>
            {actual && (actual.state === 'post' || actual.state === 'in') ? (
              <span className="match-score">{actual.score}</span>
            ) : (
              <span className="match-vs">vs</span>
            )}
            <span className={`team-b${actual?.winner === group.teamB ? ' winner' : ''}`}>
              <span className="rank">#{rankB}</span> {group.teamB}
            </span>
          </span>
          <StatusBadge timing={timing} kickoff={group.kickoff} now={now} actual={actual} />
        </div>
        <div className="match-info-row">
          <span className="match-datetime">{fmtKickoff(group.kickoff)}</span>
          {group.venue && <span className="match-venue">· {group.venue}</span>}
        </div>
        <div className="match-factors">
          {higherRanked ? (
            <span className="factor-tag rank">Rank: {higherRanked} {rankDiff > 20 ? '↑↑' : '↑'}</span>
          ) : (
            <span className="factor-tag rank">Rank: Even</span>
          )}
          {betterForm ? (
            <span className="factor-tag form">Form: {betterForm} ↑</span>
          ) : (
            <span className="factor-tag form">Form: Even</span>
          )}
          {(isHomeA || isHomeB) && (
            <span className="factor-tag home">🏠 {isHomeA ? group.teamA : group.teamB}</span>
          )}
          {(titlesA > 0 || titlesB > 0) && (
            <span className="factor-tag titles">
              🏆 {titlesA > titlesB ? `${group.teamA} (${titlesA})` : titlesB > titlesA ? `${group.teamB} (${titlesB})` : `Both`}
            </span>
          )}
          {rivalry && <span className="factor-tag rivalry">⚔️ {rivalry}</span>}
          {isFinished && keyFactors.length > 0 && (
            <span className={`factor-tag result ${keyFactors.filter(f => (f.score > 0 ? group.teamA : group.teamB) === actual?.winner).length > keyFactors.length / 2 ? 'good' : 'bad'}`}>
              {keyFactors.filter(f => (f.score > 0 ? group.teamA : group.teamB) === actual?.winner).length}/{keyFactors.length} ✓
            </span>
          )}
        </div>
      </div>
      
      {actual && (actual.state === 'post' || actual.state === 'in') && (
        <div className="actual-row">
          <span className="actual-label">{actual.state === 'in' ? 'Live' : 'Result'}</span>
          <span className={actual.winner === group.teamA ? 'w' : actual.winner ? 'l' : ''}>{group.teamA}</span>
          <span className="sc">{actual.score}</span>
          <span className={actual.winner === group.teamB ? 'w' : actual.winner ? 'l' : ''}>{group.teamB}</span>
          {!actual.winner && actual.state === 'post' && <span className="draw-tag">Draw</span>}
        </div>
      )}
      
      {actual?.goals && actual.goals.length > 0 && (
        <div className="goals-timeline">
          <div className="goals-col team-a-goals">
            {actual.goals
              .filter(g => g.team === group.teamA)
              .map((g, i) => (
                <div key={i} className={`goal-event ${g.type || 'goal'}`}>
                  <span className="goal-minute">{g.minute}'</span>
                  <span className="goal-player">{g.player}</span>
                  {g.type === 'penalty' && <span className="goal-type">P</span>}
                  {g.type === 'own-goal' && <span className="goal-type">OG</span>}
                </div>
              ))}
          </div>
          <div className="goals-divider">⚽</div>
          <div className="goals-col team-b-goals">
            {actual.goals
              .filter(g => g.team === group.teamB)
              .map((g, i) => (
                <div key={i} className={`goal-event ${g.type || 'goal'}`}>
                  <span className="goal-minute">{g.minute}'</span>
                  <span className="goal-player">{g.player}</span>
                  {g.type === 'penalty' && <span className="goal-type">P</span>}
                  {g.type === 'own-goal' && <span className="goal-type">OG</span>}
                </div>
              ))}
          </div>
        </div>
      )}
      
      {keyFactors.length > 0 && (
        <div className="factors-breakdown">
          {keyFactors.slice(0, 6).map((f) => {
            const predicted = f.score > 0 ? group.teamA : group.teamB;
            const worked = isFinished ? predicted === actual?.winner : null;
            return (
              <span 
                key={f.name} 
                className={`factor-chip ${isFinished ? (worked ? 'worked' : 'failed') : 'pending'}`}
                title={f.reason}
              >
                {formatFactorName(f.name)}: {f.favoredTeam}
                {isFinished && (worked ? ' ✓' : ' ✗')}
              </span>
            );
          })}
        </div>
      )}
      
      {dynamicFactors && dynamicFactors.adjustments.length > 0 && !isFinished && (
        <div className="dynamic-factors">
          <span className="dynamic-label">🔴 Live Factors</span>
          <div className="dynamic-adjustments">
            {dynamicFactors.weather && (
              <span className="dynamic-weather" title={dynamicFactors.weather.description}>
                {dynamicFactors.weather.condition === 'rain' ? '🌧️' : 
                 dynamicFactors.weather.condition === 'hot' ? '🔥' : 
                 dynamicFactors.weather.condition === 'cold' ? '❄️' : '☀️'}
                {dynamicFactors.weather.temp}°C
              </span>
            )}
            {dynamicFactors.adjustments.map((adj, i) => (
              <span 
                key={i} 
                className={`dynamic-chip ${adj.favoredTeam === group.teamA ? 'team-a' : adj.favoredTeam === group.teamB ? 'team-b' : ''}`}
                title={adj.reason}
              >
                {adj.icon} {adj.factor}: {adj.favoredTeam !== 'neutral' && adj.favoredTeam !== 'physical' ? adj.favoredTeam : 'Even'}
              </span>
            ))}
          </div>
          {(dynamicFactors.totalAdjustmentA !== 0 || dynamicFactors.totalAdjustmentB !== 0) && (
            <div className="dynamic-summary">
              Adjustment: {group.teamA} {dynamicFactors.totalAdjustmentA > 0 ? '+' : ''}{dynamicFactors.totalAdjustmentA} | {group.teamB} {dynamicFactors.totalAdjustmentB > 0 ? '+' : ''}{dynamicFactors.totalAdjustmentB}
            </div>
          )}
        </div>
      )}
      
      <div className="model-picks">
        {group.picks.map(({ m, md }) => {
          const ok = actual ? predictionCorrect(m.winner, actual) : null;
          return (
            <div key={m.id} className={`model-pick ${md.id}`}>
              <span className="pick-model">{md.name}</span>
              <span className="pick-winner">{m.winner}</span>
              <span className="pick-score">{m.score}</span>
              <span className={`pick-conf ${pctClass(m.pct)}`}>{m.pct}%</span>
              {ok === true && <span className="ok">✓</span>}
              {ok === false && <span className="bad">✗</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AccuracyBoard({ scores }: { scores: ModelAccuracy[] }) {
  const sorted = [...scores].sort((a, b) => {
    if (b.correct !== a.correct) return b.correct - a.correct;
    return b.total - a.total;
  });
  const leader = sorted[0];
  const completed = scores.reduce((s, x) => s + x.total, 0);

  return (
    <div className="accuracy-panel">
      <p className="meta">
        {completed} completed matches scored · winner prediction accuracy
        {leader && leader.total > 0 && (
          <> · leading: <strong className={leader.id}>{leader.name}</strong> ({accuracyPct(leader.correct, leader.total)})</>
        )}
      </p>
      <div className="accuracy-cards">
        {sorted.map((s, i) => (
          <article key={s.id} className={`accuracy-card ${s.id}${i === 0 && s.total > 0 ? ' leader' : ''}`}>
            <strong>{s.name}</strong>
            <p className="acc-score">{s.correct}/{s.total}</p>
            <p className="acc-pct">{accuracyPct(s.correct, s.total)}</p>
            {i === 0 && s.total > 0 && <span className="leader-tag">Most accurate</span>}
          </article>
        ))}
      </div>
    </div>
  );
}

interface TeamStanding {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

function computeGroupStandings(
  letter: string,
  teams: readonly string[],
  byTeams: Map<string, EspnResult>,
): TeamStanding[] {
  const fixtures = GROUP_FIXTURES.filter((f) => f.group === letter);
  const standings = new Map<string, TeamStanding>();

  for (const team of teams) {
    standings.set(team, { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
  }

  for (const fix of fixtures) {
    const result = byTeams.get(teamsKey(fix.teamA, fix.teamB));
    if (!result || result.state !== 'post') continue;

    const [scoreA, scoreB] = result.score.split('–').map((s) => parseInt(s, 10) || 0);
    const sA = standings.get(fix.teamA);
    const sB = standings.get(fix.teamB);
    if (!sA || !sB) continue;

    sA.played++;
    sB.played++;
    sA.gf += scoreA;
    sA.ga += scoreB;
    sB.gf += scoreB;
    sB.ga += scoreA;

    if (result.winner === fix.teamA) {
      sA.won++;
      sA.pts += 3;
      sB.lost++;
    } else if (result.winner === fix.teamB) {
      sB.won++;
      sB.pts += 3;
      sA.lost++;
    } else {
      sA.drawn++;
      sB.drawn++;
      sA.pts += 1;
      sB.pts += 1;
    }
  }

  for (const s of standings.values()) {
    s.gd = s.gf - s.ga;
  }

  return [...standings.values()].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
}

function isEliminatedFromGroup(
  team: string,
  standings: TeamStanding[],
): boolean {
  const totalMatches = 3;
  const teamStanding = standings.find((s) => s.team === team);
  if (!teamStanding) return false;

  const remainingMatches = totalMatches - teamStanding.played;
  const maxPossiblePts = teamStanding.pts + remainingMatches * 3;

  const pos = standings.findIndex((s) => s.team === team) + 1;
  if (pos <= 3) return false;

  const thirdPlace = standings[2];
  if (!thirdPlace) return false;

  const thirdMinPts = thirdPlace.pts;

  if (maxPossiblePts < thirdMinPts) return true;

  const allGroupMatchesPlayed = standings.every((s) => s.played === totalMatches);
  if (allGroupMatchesPlayed && pos > 3) return true;

  return false;
}

function GroupCard({
  letter,
  byTeams,
  hasData,
}: {
  letter: string;
  byTeams: Map<string, EspnResult>;
  hasData: boolean;
}) {
  const group = MODELS[0].groups.find((g) => g.letter === letter)!;
  const standings = useMemo(
    () => computeGroupStandings(letter, group.teams, byTeams),
    [letter, group.teams, byTeams],
  );
  const hasResults = standings.some((s) => s.played > 0);

  return (
    <article className="group-card">
      <h3>Group {letter}</h3>
      <div className="group-table">
        <div className="group-table-inner">
          <div className="group-row head">
            <span className="pos-col">Pos</span>
            <span className="team-col">Team</span>
            <span className="rank-col">Rank</span>
            {hasData && (
              <>
                <span className="stat-col">P</span>
                <span className="stat-col">W</span>
                <span className="stat-col">D</span>
                <span className="stat-col">L</span>
                <span className="stat-col">GD</span>
                <span className="stat-col pts-col">Pts</span>
              </>
            )}
            {MODELS.map((md) => (
              <span key={md.id} className={`col-h ${md.id}`}>{md.name}</span>
            ))}
          </div>
          {(hasResults
            ? standings
            : [...standings].sort((a, b) => group.teams.indexOf(a.team) - group.teams.indexOf(b.team))
          ).map((s, idx) => {
            const pos = hasResults ? idx + 1 : group.teams.indexOf(s.team) + 1;
            const eliminated = hasResults && isEliminatedFromGroup(s.team, standings);

            return (
              <div key={s.team} className={`group-row${eliminated ? ' eliminated' : ''}`}>
                <span className="pos pos-col">{pos}</span>
                <span className={`team-name team-col${eliminated ? ' strikeout' : ''}`}>{s.team}</span>
                <span className="rank-col">#{FIFA_RANKINGS[s.team] ?? '-'}</span>
                {hasData && (
                  <>
                    <span className="stat-col">{s.played}</span>
                    <span className="stat-col">{s.won}</span>
                    <span className="stat-col">{s.drawn}</span>
                    <span className="stat-col">{s.lost}</span>
                    <span className="stat-col">{s.gd > 0 ? `+${s.gd}` : s.gd}</span>
                    <span className="stat-col pts-col">{s.pts}</span>
                  </>
                )}
                {MODELS.map((md) => {
                  const predIdx = md.groups.find((g) => g.letter === letter)!.teams.indexOf(s.team as (typeof md.groups)[number]['teams'][number]);
                  const through = predIdx < 2 || (predIdx === 2 && md.bestThird.includes(s.team));
                  return (
                    <span key={md.id} className={`status ${through ? 'w' : 'l'}`}>
                      {through ? (predIdx === 2 ? '3rd ✓' : 'Through') : 'Out'}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {hasResults && (
        <p className="group-legend">Live standings · strikeout = mathematically eliminated</p>
      )}
    </article>
  );
}

const ALL_FACTORS = [
  { key: 'fifaRanking', label: 'FIFA Ranking' },
  { key: 'groupPosition', label: 'Group Position' },
  { key: 'tournamentForm', label: 'Tournament Form' },
  { key: 'worldCupHistory', label: 'WC History' },
  { key: 'squadValue', label: 'Squad Strength' },
  { key: 'recentForm', label: 'Recent Form' },
  { key: 'homeContinent', label: 'Home Advantage' },
  { key: 'upsetPotential', label: 'Upset Factor' },
] as const;

export default function App() {
  const [tab, setTab] = usePathTab();
  const [model, setModel] = useState('all');
  const [stage, setStage] = useState<'all' | ScheduleStage>('all');
  const [date, setDate] = useState('');
  const [team, setTeam] = useState('');
  const [location, setLocation] = useState('all');
  const [timeFilter, setTimeFilter] = useState<'all' | TimeSlot>('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [factorFilter, setFactorFilter] = useState<'all' | 'worked' | 'failed' | string>('all');
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(() => new Set(ALL_DATES));
  const now = useNow();
  const { byId, byTeams, loading, error, lastFetchedAt, fetchMs, refresh, hasData } = useEspnResults();
  const { bets, summary, error: betsError, addBet, settleBet, deleteBet } = useBets();
  const { getPrediction } = useLearning();
  const { loading: dynamicLoading, computeForMatches, getFactors } = useDynamicFactors();

  // Combined refresh that fetches ESPN data and computes dynamic factors
  const handleRefresh = useCallback(async () => {
    await refresh();
    // Compute dynamic factors for upcoming matches
    const matchesToCompute = GROUP_FIXTURES.map(f => ({
      id: f.id,
      teamA: f.teamA,
      teamB: f.teamB,
      kickoff: f.kickoff,
      venue: f.venue,
    }));
    await computeForMatches(matchesToCompute, byTeams);
  }, [refresh, computeForMatches, byTeams]);

  const [editingBet, setEditingBet] = useState<string | null>(null);
  const [betInputs, setBetInputs] = useState<Record<string, { pick: string; stake: string }>>({});

  const accuracy = useMemo(
    () => computeModelAccuracy(MODELS, byId, byTeams),
    [byId, byTeams],
  );

  const lookup = useCallback(
    (g: SlotGroup) => lookupResult(g.espnId, g.teamA, g.teamB, byId, byTeams),
    [byId, byTeams],
  );

  const getTiming = useCallback(
    (g: SlotGroup) => resolveTiming(lookup(g), g.kickoff, now),
    [lookup, now],
  );

  const fixtures = useMemo(() => {
    const active = MODELS.filter((md) => model === 'all' || md.id === model);
    const map = new Map<string, SlotGroup>();

    for (const md of active) {
      for (const m of md.matches) {
        if (stage !== 'all' && stage !== m.stage) continue;
        if (date && localDateKey(m.kickoff) !== date) continue;
        if (team && m.teamA !== team && m.teamB !== team) continue;
        if (location !== 'all' && m.venue && !m.venue.toLowerCase().includes(location.toLowerCase())) continue;
        if (timeFilter !== 'all' && getTimeSlot(m.kickoff) !== timeFilter) continue;

        const key = model === 'all' ? slotKey(m) : `${slotKey(m)}|${m.teamA}|${m.teamB}`;
        if (!map.has(key)) {
          map.set(key, {
            key,
            id: m.id,
            stage: m.stage,
            kickoff: m.kickoff,
            slot: m.slot,
            groupLetter: m.group,
            espnId: espnIdFromMatchId(m.id),
            venue: m.venue,
            teamA: m.teamA,
            teamB: m.teamB,
            picks: [],
          });
        }
        map.get(key)!.picks.push({ m, md });
      }
    }

    for (const g of map.values()) {
      g.picks.sort((a, b) => a.md.name.localeCompare(b.md.name));
    }

    return [...map.values()].sort(
      (a, b) => a.kickoff.localeCompare(b.kickoff) || a.slot - b.slot,
    );
  }, [model, stage, date, team, location, timeFilter]);

  // Get unique scores from completed matches for filter dropdown with counts
  const scoreData = useMemo(() => {
    const scoreCounts = new Map<string, number>();
    for (const g of fixtures) {
      const actual = lookupResult(g.espnId, g.teamA, g.teamB, byId, byTeams);
      if (actual?.state === 'post' && actual.score) {
        const [a, b] = actual.score.split('–').map(s => parseInt(s, 10) || 0);
        const normalized = a >= b ? `${a}–${b}` : `${b}–${a}`;
        scoreCounts.set(normalized, (scoreCounts.get(normalized) || 0) + 1);
      }
    }
    return [...scoreCounts.entries()]
      .map(([score, count]) => ({ score, count }))
      .sort((x, y) => {
        const [xa, xb] = x.score.split('–').map(Number);
        const [ya, yb] = y.score.split('–').map(Number);
        const xTotal = xa + xb;
        const yTotal = ya + yb;
        if (xTotal !== yTotal) return yTotal - xTotal;
        return yb - ya - (xb - xa);
      });
  }, [fixtures, byId, byTeams]);

  // Apply score and factor filters
  const filteredFixtures = useMemo(() => {
    let result = fixtures;
    
    // Apply score filter
    if (scoreFilter !== 'all') {
      result = result.filter((g) => {
        const actual = lookupResult(g.espnId, g.teamA, g.teamB, byId, byTeams);
        if (!actual || actual.state !== 'post') return false;
        
        // Normalize the actual score for comparison
        const [a, b] = actual.score.split('–').map(s => parseInt(s, 10) || 0);
        const normalized = a >= b ? `${a}–${b}` : `${b}–${a}`;
        
        return normalized === scoreFilter;
      });
    }
    
    // Apply factor filter
    if (factorFilter !== 'all') {
      result = result.filter((g) => {
        if (g.stage !== 'group') return factorFilter === 'all';
        
        const actual = lookupResult(g.espnId, g.teamA, g.teamB, byId, byTeams);
        if (!actual || actual.state !== 'post') return false;
        
        const aiPred = getPrediction(g.teamA, g.teamB);
        const factorsWorked = aiPred.factors.filter(f => {
          if (f.score === 0) return false;
          const factorPredictedWinner = f.score > 0 ? g.teamA : g.teamB;
          return factorPredictedWinner === actual.winner;
        }).map(f => f.name);
        
        const factorsFailed = aiPred.factors.filter(f => {
          if (f.score === 0) return false;
          const factorPredictedWinner = f.score > 0 ? g.teamA : g.teamB;
          return factorPredictedWinner !== actual.winner;
        }).map(f => f.name);
        
        if (factorFilter === 'worked') return factorsWorked.length > 0;
        if (factorFilter === 'failed') return factorsFailed.length > 0;
        
        return factorsWorked.includes(factorFilter);
      });
    }
    
    return result;
  }, [fixtures, scoreFilter, factorFilter, byId, byTeams, getPrediction]);

  const scoredCount = accuracy.reduce((s, a) => s + a.total, 0);

  const patternAnalysis = useMemo(
    () => analyzePatterns(byId, byTeams),
    [byId, byTeams],
  );

  return (
    <div className="page">
      <header className="app-header">
        <div className="header-top">
          <h1>
            <a href="/Schedule" className="site-title" onClick={(e) => { e.preventDefault(); setTab('schedule'); }}>
              FIFA World Cup 2026
            </a>
          </h1>
          <div className="header-top-right">
            {lastFetchedAt && !error && (
              <span className="fetch-meta-inline">
                Updated {new Date(lastFetchedAt).toLocaleTimeString()}
                {fetchMs > 0 && ` · ${fetchMs}ms`}
              </span>
            )}
            <button type="button" className={`fetch-btn ${loading || dynamicLoading ? 'loading' : ''}`} onClick={handleRefresh} disabled={loading || dynamicLoading}>
              <span className="fetch-icon">{loading || dynamicLoading ? '⏳' : '🔄'}</span>
              {loading ? 'Fetching…' : dynamicLoading ? 'Analyzing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && <p className="fetch-err">{error}</p>}
        {!hasData && !loading && !error && (
          <p className="fetch-hint">Click Refresh to load live scores from ESPN</p>
        )}

        <nav className="nav-tabs" aria-label="Sections">
          {NAV_TABS.map((t) => (
            <a
              key={t}
              href={TAB_PATHS[t]}
              className={tab === t ? 'on' : ''}
              onClick={(e) => {
                e.preventDefault();
                setTab(t);
              }}
            >
              {TAB_LABELS[t]}
            </a>
          ))}
        </nav>

        {(tab === 'schedule' || tab === 'accuracy') && (() => {
          const today = new Date().toISOString().split('T')[0];
          
          const modelOptions: DropdownOption[] = [
            { value: 'all', label: 'All models', icon: '🤖' },
            ...MODELS.map((md) => ({
              value: md.id,
              label: md.name,
              icon: md.id === 'claude' ? '🟠' : md.id === 'gpt' ? '🟢' : '🟣',
            })),
          ];

          const stageOptions: DropdownOption[] = [
            { value: 'all', label: 'All stages', icon: '🏟️' },
            ...ALL_STAGES.map((s) => ({
              value: s.key,
              label: s.label,
              icon: s.key === 'group' ? '📊' : s.key === 'final' ? '🏆' : '⚔️',
            })),
          ];

          const dateOptions: DropdownOption[] = [
            { value: '', label: 'All dates', icon: '📅' },
            ...ALL_DATES.map((d) => {
              const isPast = d < today;
              const isToday = d === today;
              return {
                value: d,
                label: fmtDateOption(d),
                icon: isPast ? '✓' : isToday ? '●' : '○',
                color: isPast ? 'oklch(50% 0.15 150)' : isToday ? 'oklch(60% 0.18 75)' : undefined,
              };
            }),
          ];

          const locationOptions: DropdownOption[] = [
            { value: 'all', label: 'All locations', icon: '📍' },
            ...ALL_LOCATIONS.map((loc) => ({
              value: loc,
              label: loc,
              icon: '🏙️',
            })),
          ];

          const timeOptions: DropdownOption[] = [
            { value: 'all', label: 'All times', icon: '🕐' },
            { value: 'early', label: 'Early · before 2 PM ET', icon: '🌅' },
            { value: 'afternoon', label: 'Afternoon · 2–6 PM ET', icon: '☀️' },
            { value: 'primetime', label: 'Primetime · 6–10 PM ET', icon: '📺' },
            { value: 'late', label: 'Late night · 10 PM+ ET', icon: '🌙' },
          ];

          const scoreOptions: DropdownOption[] = [
            { value: 'all', label: 'All scores', icon: '⚽' },
            ...scoreData.map(({ score, count }) => ({
              value: score,
              label: score,
              badge: String(count),
              icon: score.includes('–0') ? '🛡️' : '⚽',
            })),
          ];

          const teamOptions: DropdownOption[] = [
            { value: '', label: 'All teams', icon: '🌍' },
            ...ALL_TEAMS.map((t) => ({
              value: t,
              label: t,
            })),
          ];

          const factorOptions: DropdownOption[] = [
            { value: 'all', label: 'All factors', icon: '📊' },
            { value: 'worked', label: 'Worked', icon: '✅' },
            { value: 'failed', label: 'Failed', icon: '❌' },
            ...ALL_FACTORS.map((f) => ({
              value: f.key,
              label: f.label,
              icon: '📈',
              group: 'Specific Factor',
            })),
          ];

          return (
            <div className="filter-bar">
              <Dropdown
                value={model}
                options={modelOptions}
                onChange={setModel}
                placeholder="Model"
                className="dropdown-model"
              />
              {tab === 'schedule' && (
                <>
                  <Dropdown
                    value={stage}
                    options={stageOptions}
                    onChange={(v) => setStage(v as 'all' | ScheduleStage)}
                    placeholder="Stage"
                  />
                  <Dropdown
                    value={date}
                    options={dateOptions}
                    onChange={setDate}
                    placeholder="Date"
                    className="dropdown-date"
                  />
                  <Dropdown
                    value={location}
                    options={locationOptions}
                    onChange={setLocation}
                    placeholder="Location"
                  />
                  <Dropdown
                    value={timeFilter}
                    options={timeOptions}
                    onChange={(v) => setTimeFilter(v as 'all' | TimeSlot)}
                    placeholder="Kickoff time"
                    className="dropdown-time"
                  />
                  <Dropdown
                    value={scoreFilter}
                    options={scoreOptions}
                    onChange={setScoreFilter}
                    placeholder="Score"
                  />
                </>
              )}
              <Dropdown
                value={team}
                options={teamOptions}
                onChange={setTeam}
                placeholder="Team"
                className="dropdown-team"
                searchable
              />
              {tab === 'schedule' && (
                <Dropdown
                  value={factorFilter}
                  options={factorOptions}
                  onChange={setFactorFilter}
                  placeholder="Factor"
                />
              )}
              {(date || team || location !== 'all' || timeFilter !== 'all' || stage !== 'all' || model !== 'all' || scoreFilter !== 'all' || factorFilter !== 'all') && (
                <button
                  type="button"
                  className="filter-clear"
                  onClick={() => {
                    setModel('all');
                    setStage('all');
                    setDate('');
                    setTeam('');
                    setLocation('all');
                    setTimeFilter('all');
                    setScoreFilter('all');
                    setFactorFilter('all');
                  }}
                >
                  <span className="clear-icon">✕</span>
                  Reset filters
                </button>
              )}
            </div>
          );
        })()}
      </header>

      <main>
        {tab === 'schedule' && (() => {
          // Group fixtures by date (using local time, not UTC)
          const fixturesByDate = filteredFixtures.reduce((acc, g) => {
            const matchDate = localDateKey(g.kickoff);
            if (!acc[matchDate]) acc[matchDate] = [];
            acc[matchDate].push(g);
            return acc;
          }, {} as Record<string, typeof filteredFixtures>);
          
          const sortedDates = Object.keys(fixturesByDate).sort();
          const today = new Date().toISOString().split('T')[0];
          
          const toggleDate = (d: string) => {
            setCollapsedDates(prev => {
              const next = new Set(prev);
              if (next.has(d)) next.delete(d);
              else next.add(d);
              return next;
            });
          };
          
          const collapseAll = () => setCollapsedDates(new Set(sortedDates));
          const expandAll = () => setCollapsedDates(new Set());
          
          return (
            <>
              {scoredCount > 0 && <AccuracyBoard scores={accuracy} />}
              <div className="schedule-header">
                <div className="collapse-controls">
                  <button type="button" className="collapse-btn" onClick={expandAll}>Expand All</button>
                  <button type="button" className="collapse-btn" onClick={collapseAll}>Collapse All</button>
                </div>
              </div>
              
              <div className="schedule-dates">
                {sortedDates.map((d) => {
                  const matches = fixturesByDate[d];
                  const isCollapsed = collapsedDates.has(d);
                  const isPast = d < today;
                  const isToday = d === today;
                  const completedInDate = matches.filter(g => lookup(g)?.state === 'post').length;
                  const liveInDate = matches.filter(g => lookup(g)?.state === 'in').length;
                  
                  return (
                    <div key={d} className={`date-group ${isPast ? 'past' : isToday ? 'today' : 'future'} ${isCollapsed ? 'collapsed' : ''}`}>
                      <button
                        type="button"
                        className="date-header"
                        onClick={() => toggleDate(d)}
                        aria-expanded={!isCollapsed}
                      >
                        <span className="date-chevron">{isCollapsed ? '▶' : '▼'}</span>
                        <span className="date-label">
                          {new Date(d + 'T12:00:00').toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </span>
                        <span className="date-stats">
                          {matches.length} match{matches.length !== 1 ? 'es' : ''}
                          {completedInDate > 0 && <span className="stat-done"> · ✓ {completedInDate}</span>}
                          {liveInDate > 0 && <span className="stat-live"> · 🔴 {liveInDate}</span>}
                        </span>
                        {isToday && <span className="today-badge">TODAY</span>}
                      </button>
                      
                      {!isCollapsed && (
                        <ul className="date-matches">
                          {matches.map((g) => {
                            const actual = lookup(g);
                            const aiPred = getPrediction(g.teamA, g.teamB);
                            const dynFactors = getFactors(g.id);
                            return (
                              <SlotCard
                                key={g.key}
                                group={g}
                                timing={getTiming(g)}
                                now={now}
                                actual={actual}
                                aiPrediction={aiPred}
                                dynamicFactors={dynFactors}
                              />
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {!filteredFixtures.length && <p className="empty">No matches — adjust filters</p>}
            </>
          );
        })()}

        {tab === 'accuracy' && (
          <>
            <AccuracyBoard scores={accuracy} />
            <p className="meta">✓ = predicted winner matched final result · ✗ = wrong · Click match to see factor breakdown</p>
            
            <div className="accuracy-matches">
              {fixtures
                .filter((g) => g.stage === 'group' && lookup(g)?.state === 'post')
                .map((g) => {
                  const actual = lookup(g);
                  const aiPred = getPrediction(g.teamA, g.teamB);
                  
                  // Get each model's prediction for this match
                  const modelPreds = g.picks.map(({ m, md }) => {
                    const isCorrect = actual?.winner 
                      ? m.winner === actual.winner
                      : m.winner === 'Draw' || (!actual?.winner && m.winner !== g.teamA && m.winner !== g.teamB);
                    return { model: md.name, modelId: md.id, predicted: m.winner, correct: isCorrect };
                  });
                  
                  const correctCount = modelPreds.filter(p => p.correct).length;
                  const allCorrect = correctCount === modelPreds.length;
                  const allWrong = correctCount === 0;
                  
                  return (
                    <details key={g.key} className={`accuracy-card ${allCorrect ? 'correct' : allWrong ? 'wrong' : 'mixed'}`}>
                      <summary className="accuracy-summary">
                        <span className="acc-match">{g.teamA} vs {g.teamB}</span>
                        <span className="acc-result">Result: {actual?.score} → {actual?.winner || 'Draw'}</span>
                        <span className="acc-models">
                          {modelPreds.map((p) => (
                            <span key={p.modelId} className={`model-pred ${p.modelId} ${p.correct ? 'ok' : 'bad'}`}>
                              {p.model}: {p.predicted} {p.correct ? '✓' : '✗'}
                            </span>
                          ))}
                        </span>
                      </summary>
                      <div className="accuracy-analysis">
                        <h4>Factor Analysis:</h4>
                        <div className="factor-analysis">
                          {aiPred.factors.filter(f => f.score !== 0).map((f) => {
                            const factorCorrect = f.favoredTeam === actual?.winner;
                            return (
                              <div key={f.name} className={`factor-row ${factorCorrect ? 'factor-correct' : 'factor-wrong'}`}>
                                <span className="factor-name">{formatFactorName(f.name)}</span>
                                <span className="factor-favors">→ {f.favoredTeam}</span>
                                <span className="factor-reason">{f.reason}</span>
                                <span className={`factor-verdict ${factorCorrect ? 'ok' : 'bad'}`}>
                                  {factorCorrect ? '✓' : '✗'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="analysis-summary">
                          {actual?.winner ? (
                            <p className={correctCount > 0 ? 'summary-correct' : 'summary-wrong'}>
                              <strong>{correctCount}/{modelPreds.length} models correct.</strong> {
                                aiPred.factors.filter(f => f.score !== 0 && f.favoredTeam === actual.winner).length
                              }/{aiPred.factors.filter(f => f.score !== 0).length} factors pointed to {actual.winner}.
                            </p>
                          ) : (
                            <p className={correctCount > 0 ? 'summary-correct' : 'summary-wrong'}>
                              <strong>Match ended in a draw.</strong> {correctCount}/{modelPreds.length} models predicted correctly.
                            </p>
                          )}
                        </div>
                      </div>
                    </details>
                  );
                })}
            </div>
            
            {!fixtures.some((g) => g.stage === 'group' && lookup(g)?.state === 'post') && (
              <p className="empty">
                {hasData
                  ? 'No completed matches yet — check back after kickoff'
                  : 'Click Refresh to load live scores from ESPN'}
              </p>
            )}
          </>
        )}

        {tab === 'groups' && (
          <>
            <p className="meta">1st & 2nd auto-advance · 3rd depends on model&apos;s best-8 pick</p>
            <div className="best-third">
              {MODELS.map((md) => (
                <div key={md.id} className={`third-block ${md.id}`}>
                  <strong>{md.name}</strong> best 3rd: {md.bestThird.join(', ')}
                </div>
              ))}
            </div>
            <div className="group-grid">
              {GROUP_LETTERS.map((letter) => (
                <GroupCard key={letter} letter={letter} byTeams={byTeams} hasData={hasData} />
              ))}
            </div>
          </>
        )}

        {tab === 'winners' && (
          <div className="outright">
            {MODELS.map((md) => (
              <article key={md.id} className={`card ${md.id}`}>
                <span className="label">{md.name}</span>
                <p className="champ w">🏆 {md.champion}</p>
                <p className="sub">vs {md.runnerUp} · {md.finalScore}</p>
                <ul>
                  {md.winPct.map((r) => (
                    <li key={r.team}>
                      <span className={r.team === md.champion ? 'w' : ''}>{r.team}</span>
                      <i style={{ width: `${r.pct * 3}%` }} />
                      <em>{r.pct}%</em>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}

        {tab === 'bets' && (
          <div className="bets-page">
            <div className="bets-summary">
              <div className="summary-card won">
                <span className="summary-label">Won</span>
                <span className="summary-value">${summary.totalWon.toFixed(2)}</span>
              </div>
              <div className="summary-card lost">
                <span className="summary-label">Lost</span>
                <span className="summary-value">${summary.totalLost.toFixed(2)}</span>
              </div>
              <div className={`summary-card ${summary.netProfit >= 0 ? 'profit' : 'loss'}`}>
                <span className="summary-label">Net</span>
                <span className="summary-value">{summary.netProfit >= 0 ? '+' : ''}${summary.netProfit.toFixed(2)}</span>
              </div>
            </div>

            {betsError && <p className="fetch-err">{betsError}</p>}
            
            <p className="meta">Click on any match to add your bet · {bets.filter(b => b.status !== 'pending').length} settled · {bets.filter(b => b.status === 'pending').length} pending</p>

            <div className="matches-bet-list">
              {GROUP_FIXTURES.map((fix) => {
                const matchId = fix.id;
                const existingBet = bets.find(b => b.matchId === matchId);
                const isEditing = editingBet === matchId;
                const inputs = betInputs[matchId] || { pick: '', stake: '' };
                const actual = byTeams.get(teamsKey(fix.teamA, fix.teamB));
                const isFinished = actual?.state === 'post';

                return (
                  <div
                    key={matchId}
                    className={`match-bet-row ${existingBet ? `has-bet status-${existingBet.status}` : ''} ${isFinished ? 'finished' : ''}`}
                  >
                    <div className="match-info">
                      <span className="match-group">Group {fix.group}</span>
                      <span className="match-teams">{fix.teamA} vs {fix.teamB}</span>
                      <span className="match-date">{fmtKickoff(fix.kickoff)}</span>
                      {isFinished && actual && (
                        <span className="match-result">{actual.score} {actual.winner ? `→ ${actual.winner}` : '(Draw)'}</span>
                      )}
                    </div>

                    {existingBet && !isEditing ? (
                      <div className="bet-info">
                        <span className="bet-pick">{existingBet.predictedWinner}</span>
                        <span className="bet-stake">${existingBet.stake.toFixed(2)}</span>
                        {existingBet.status === 'pending' ? (
                          <div className="bet-quick-actions">
                            <button type="button" className="btn-won" onClick={() => settleBet(existingBet.id, true)}>Won</button>
                            <button type="button" className="btn-lost" onClick={() => settleBet(existingBet.id, false)}>Lost</button>
                            <button type="button" className="btn-edit" onClick={() => {
                              setEditingBet(matchId);
                              setBetInputs({ ...betInputs, [matchId]: { pick: existingBet.predictedWinner, stake: existingBet.stake.toString() } });
                            }}>Edit</button>
                          </div>
                        ) : (
                          <div className="bet-quick-actions">
                            <span className={`bet-outcome ${existingBet.status}`}>
                              {existingBet.status === 'won' ? `+$${existingBet.stake.toFixed(2)}` : `-$${existingBet.stake.toFixed(2)}`}
                            </span>
                            <button type="button" className="btn-edit" onClick={() => {
                              setEditingBet(matchId);
                              setBetInputs({ ...betInputs, [matchId]: { pick: existingBet.predictedWinner, stake: existingBet.stake.toString() } });
                            }}>Edit</button>
                          </div>
                        )}
                      </div>
                    ) : isEditing || (!existingBet && editingBet === matchId) ? (
                      <div className="bet-form-inline">
                        <Dropdown
                          value={inputs.pick}
                          options={[
                            { value: '', label: 'Pick winner', icon: '🎯' },
                            { value: fix.teamA, label: fix.teamA, icon: '🏠' },
                            { value: fix.teamB, label: fix.teamB, icon: '✈️' },
                            { value: 'Draw', label: 'Draw', icon: '🤝' },
                          ]}
                          onChange={(v) => setBetInputs({ ...betInputs, [matchId]: { ...inputs, pick: v } })}
                          placeholder="Pick"
                          className="dropdown-bet-pick"
                        />
                        <div className="stake-input">
                          <span className="stake-prefix">$</span>
                          <input
                            type="number"
                            placeholder="0"
                            step="1"
                            min="0"
                            value={inputs.stake}
                            onChange={(e) => setBetInputs({ ...betInputs, [matchId]: { ...inputs, stake: e.target.value } })}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn-save"
                          onClick={async () => {
                            if (!inputs.pick || !inputs.stake) return;
                            if (existingBet) {
                              await deleteBet(existingBet.id);
                            }
                            await addBet({
                              matchId,
                              matchLabel: `${fix.teamA} vs ${fix.teamB}`,
                              kickoff: fix.kickoff,
                              predictedWinner: inputs.pick,
                              stake: parseFloat(inputs.stake) || 0,
                              odds: 1,
                              status: 'pending',
                              payout: 0,
                            });
                            setEditingBet(null);
                            setBetInputs({ ...betInputs, [matchId]: { pick: '', stake: '' } });
                          }}
                        >
                          Save
                        </button>
                        <button type="button" className="btn-cancel" onClick={() => setEditingBet(null)}>Cancel</button>
                        {existingBet && (
                          <button type="button" className="btn-delete" onClick={async () => {
                            await deleteBet(existingBet.id);
                            setEditingBet(null);
                          }}>Delete</button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-add-bet"
                        onClick={() => setEditingBet(matchId)}
                      >
                        + Bet
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'stats' && (() => {
          // Compute real stats from ESPN data
          const allResults = [...byTeams.values()].filter(r => r.state === 'post');
          
          // Compute top scorers from goal events
          const playerGoals = new Map<string, { goals: number; penalties: number; team: string; matchIds: Set<string> }>();
          for (const result of allResults) {
            if (result.goals) {
              for (const goal of result.goals) {
                if (goal.type === 'own-goal') continue; // Don't count own goals for scorer
                const key = `${goal.player}|${goal.team}`;
                const current = playerGoals.get(key) || { goals: 0, penalties: 0, team: goal.team, matchIds: new Set<string>() };
                current.goals++;
                if (goal.type === 'penalty') current.penalties++;
                current.matchIds.add(result.id);
                playerGoals.set(key, current);
              }
            }
          }
          
          const topScorers = [...playerGoals.entries()]
            .map(([key, data]) => ({
              name: key.split('|')[0],
              team: data.team,
              goals: data.goals,
              penalties: data.penalties,
              games: data.matchIds.size,
            }))
            .sort((a, b) => b.goals - a.goals)
            .slice(0, 10);
          
          // Find high-scoring matches and records
          const highScoringMatches = allResults
            .map(r => {
              const [a, b] = r.score.split('–').map(s => parseInt(s, 10) || 0);
              return { ...r, totalGoals: a + b, margin: Math.abs(a - b) };
            })
            .sort((a, b) => b.totalGoals - a.totalGoals)
            .slice(0, 4);
          
          // Find fastest goal
          let fastestGoal: { player: string; team: string; minute: string } | null = null;
          for (const result of allResults) {
            if (result.goals) {
              for (const goal of result.goals) {
                if (goal.type === 'own-goal') continue;
                const minuteNum = parseInt(goal.minute.replace("'", ''), 10) || 999;
                const currentFastest = fastestGoal ? parseInt(fastestGoal.minute.replace("'", ''), 10) || 999 : 999;
                if (minuteNum < currentFastest) {
                  fastestGoal = { player: goal.player, team: goal.team, minute: goal.minute };
                }
              }
            }
          }
          
          // Tournament totals
          let totalGoals = 0;
          for (const r of allResults) {
            const [a, b] = r.score.split('–').map(s => parseInt(s, 10) || 0);
            totalGoals += a + b;
          }
          const avgGoals = allResults.length > 0 ? (totalGoals / allResults.length).toFixed(2) : '0';
          
          return (
          <div className="stats-page">
            <div className="stats-header stats-header-compact">
              <h2>🏆 World Cup 2026 Stats</h2>
              <div className="stats-summary-chips">
                <span>{allResults.length} matches</span>
                <span>{totalGoals} goals</span>
                <span>{avgGoals} per game</span>
              </div>
            </div>

            <div className="stats-grid-two-col">
              <section className="stats-section stats-section-compact">
                <div className="section-header section-header-compact">
                  <h3>👟 Golden Boot</h3>
                </div>
                {topScorers.length > 0 ? (
                  <div className="scorers-list scorers-list-compact">
                    <div className="list-header">
                      <span className="col-rank">#</span>
                      <span className="col-player">Player</span>
                      <span className="col-team">Team</span>
                      <span className="col-goals">G</span>
                      <span className="col-games">GP</span>
                      <span className="col-penalties" title="Penalty goals">PK</span>
                    </div>
                    {topScorers.map((player, idx) => (
                      <div key={`${player.name}-${player.team}`} className={`scorer-row ${idx < 3 ? 'top-3' : ''}`}>
                        <span className="col-rank">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</span>
                        <span className="col-player"><strong>{player.name}</strong></span>
                        <span className="col-team">
                          <TeamFlag team={player.team} size={14} />
                          {player.team}
                        </span>
                        <span className="col-goals">{player.goals}</span>
                        <span className="col-games">{player.games}</span>
                        <span className="col-penalties">{player.penalties || '—'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data no-data-compact">No goal data yet — refresh after matches are played.</p>
                )}
              </section>

              <section className="stats-section stats-section-compact">
                <div className="section-header section-header-compact">
                  <h3>📊 Snapshot</h3>
                </div>
                <div className="stats-records-row stats-records-stack">
                  <div className="stats-record-chip">
                    <span className="chip-label">Total goals</span>
                    <span className="chip-value">{totalGoals}</span>
                  </div>
                  <div className="stats-record-chip">
                    <span className="chip-label">Avg / match</span>
                    <span className="chip-value">{avgGoals}</span>
                  </div>
                  {fastestGoal && (
                    <div className="stats-record-chip">
                      <span className="chip-label">Fastest goal</span>
                      <span className="chip-value">{fastestGoal.minute}</span>
                      <span className="chip-detail">{fastestGoal.player}</span>
                    </div>
                  )}
                  {highScoringMatches[0] && (
                    <div className="stats-record-chip">
                      <span className="chip-label">Highest scoring</span>
                      <span className="chip-value">{highScoringMatches[0].totalGoals} goals</span>
                      <span className="chip-detail">{highScoringMatches[0].teamA} {highScoringMatches[0].score} {highScoringMatches[0].teamB}</span>
                    </div>
                  )}
                </div>

                {highScoringMatches.length > 0 && (
                  <>
                    <h4 className="stats-subheading">High-scoring matches</h4>
                    <div className="scorers-list scorers-list-compact stats-matches-list">
                      <div className="list-header">
                        <span className="col-match">Match</span>
                        <span className="col-score-sm">Score</span>
                        <span className="col-total">Goals</span>
                      </div>
                      {highScoringMatches.map((match) => (
                        <div key={match.id} className="scorer-row match-row-compact">
                          <span className="col-match">{match.teamA} vs {match.teamB}</span>
                          <span className="col-score-sm">{match.score}</span>
                          <span className="col-total">{match.totalGoals}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        );
        })()}

        {tab === 'pattern' && (
          <div className="pattern-page">
            <div className="stats-header">
              <h2>📈 Goal Pattern Lab</h2>
              <p className="meta">
                {patternAnalysis.sampleSize > 0
                  ? `Analyzing ${patternAnalysis.sampleSize} completed matches · ${patternAnalysis.tournamentAvgGoals} goals per game`
                  : 'Refresh ESPN data to start detecting patterns'}
              </p>
            </div>

            <section className="stats-section pattern-insights">
              <div className="section-header">
                <h3>🔍 What we&apos;re seeing</h3>
                <span className="section-subtitle">Live pattern signals</span>
              </div>
              <div className="pattern-insights-table-wrap">
                <table className="pattern-insights-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Signal</th>
                      <th>Finding</th>
                      <th>Goals</th>
                      <th>vs Avg</th>
                      <th>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patternAnalysis.takeaways.map((row, i) => (
                      <tr key={i} className={`insight-row trend-${row.trend}`}>
                        <td className="insight-category">
                          <span className="insight-icon">{row.icon}</span>
                          {row.category}
                        </td>
                        <td className="insight-signal">{row.signal}</td>
                        <td className="insight-finding">{row.finding}</td>
                        <td className="insight-metric">
                          <span className="metric-pill">{row.metric}</span>
                          {row.sample > 0 && (
                            <span className="sample-count">{row.sample} gp</span>
                          )}
                        </td>
                        <td className="insight-delta">
                          {row.delta != null ? (
                            <span className={row.delta >= 0 ? 'delta-pos' : 'delta-neg'}>
                              {row.delta >= 0 ? '+' : ''}{row.delta}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="insight-trend">
                          <span className={`pattern-trend-badge ${row.trend}`}>
                            {row.trend === 'high' ? '↑ High' : row.trend === 'low' ? '↓ Low' : '≈ Avg'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="stats-section pattern-rivalries-section">
              <div className="section-header">
                <h3>⚔️ Famous FIFA rivalries</h3>
                <span className="section-subtitle">
                  {FAMOUS_RIVALRIES.filter((r) => r.wc2026).length} possible in WC 2026
                </span>
              </div>
              <div className="rivalries-table-wrap">
                <table className="rivalries-table">
                  <thead>
                    <tr>
                      <th>Matchup</th>
                      <th>Rivalry</th>
                      <th>Region</th>
                      <th>Story</th>
                      <th>WC 2026</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FAMOUS_RIVALRIES.map((r) => (
                      <tr key={`${r.teamA}-${r.teamB}`} className={`rivalry-row intensity-${r.intensity} ${r.wc2026 ? 'in-tournament' : ''}`}>
                        <td className="rivalry-matchup">
                          <span className="rivalry-teams">
                            <TeamFlag team={r.teamA} size={18} /> {r.teamA}
                            <span className="vs">vs</span>
                            <TeamFlag team={r.teamB} size={18} /> {r.teamB}
                          </span>
                        </td>
                        <td className="rivalry-name">
                          <strong>{r.name}</strong>
                          <span className={`intensity-tag ${r.intensity}`}>{r.intensity}</span>
                        </td>
                        <td className="rivalry-region">{r.region}</td>
                        <td className="rivalry-story">{r.story}</td>
                        <td className="rivalry-wc">
                          {r.wc2026 ? (
                            <span className="wc-badge yes">Possible</span>
                          ) : (
                            <span className="wc-badge no">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="stats-section">
              <div className="section-header">
                <h3>🕐 Time slot vs goals</h3>
                <span className="section-subtitle">US Eastern kickoff (TV primetime proxy)</span>
              </div>
              <PatternBucketGrid buckets={patternAnalysis.timeSlots} baseline={patternAnalysis.tournamentAvgGoals} />
            </section>

            <section className="stats-section">
              <div className="section-header">
                <h3>📺 Viewership proxy</h3>
                <span className="section-subtitle">Star nations &amp; headline teams</span>
              </div>
              <PatternBucketGrid buckets={patternAnalysis.viewership} baseline={patternAnalysis.tournamentAvgGoals} />
            </section>

            <div className="pattern-two-col">
              <section className="stats-section">
                <div className="section-header">
                  <h3>📅 Weekend vs weekday</h3>
                </div>
                <PatternBucketGrid buckets={patternAnalysis.weekend} baseline={patternAnalysis.tournamentAvgGoals} compact />
              </section>
              <section className="stats-section">
                <div className="section-header">
                  <h3>🏠 Host nations</h3>
                </div>
                <PatternBucketGrid buckets={patternAnalysis.hostNation} baseline={patternAnalysis.tournamentAvgGoals} compact />
              </section>
            </div>

            <section className="stats-section">
              <div className="section-header">
                <h3>⚔️ Rivalries &amp; ranking gap</h3>
                <span className="section-subtitle">Derbies and mismatch theory</span>
              </div>
              <div className="pattern-two-col">
                <PatternBucketGrid buckets={patternAnalysis.rivalries} baseline={patternAnalysis.tournamentAvgGoals} compact />
                <PatternBucketGrid buckets={patternAnalysis.rankingGap} baseline={patternAnalysis.tournamentAvgGoals} compact />
              </div>
            </section>

            <section className="stats-section">
              <div className="section-header">
                <h3>🌎 Venue region</h3>
                <span className="section-subtitle">USA · Mexico · Canada</span>
              </div>
              <PatternBucketGrid buckets={patternAnalysis.regions} baseline={patternAnalysis.tournamentAvgGoals} />
            </section>

            <section className="stats-section">
              <div className="section-header">
                <h3>🎯 Upcoming — entertainment radar</h3>
                <span className="section-subtitle">Pattern-weighted picks</span>
              </div>
              {patternAnalysis.upcoming.length > 0 ? (
                <div className="pattern-upcoming-grid">
                  {patternAnalysis.upcoming.map((m) => (
                    <div key={m.id} className="pattern-upcoming-card">
                      <div className="pattern-upcoming-top">
                        <span className="pattern-teams">
                          <TeamFlag team={m.teamA} size={18} /> {m.teamA}
                          <span className="vs">vs</span>
                          <TeamFlag team={m.teamB} size={18} /> {m.teamB}
                        </span>
                        <span className={`pattern-score ${m.entertainmentScore >= 70 ? 'hot' : m.entertainmentScore >= 50 ? 'warm' : 'cool'}`}>
                          {m.entertainmentScore}
                        </span>
                      </div>
                      <div className="pattern-upcoming-meta">
                        <span>{fmtKickoff(m.kickoff)}</span>
                        <span className="pattern-predicted">~{m.predictedGoals} goals</span>
                      </div>
                      <div className="pattern-signals">
                        {m.signals.map((s) => (
                          <span key={s} className="pattern-signal">{s}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">All group fixtures completed — knockout patterns coming soon.</p>
              )}
            </section>

            <p className="pattern-disclaimer">
              Patterns are descriptive, not guarantees. Viewership is estimated from star teams and primetime slots — not actual TV ratings.
            </p>
          </div>
        )}

        {tab === 'bracket' && (
          <div className="bracket-page">
            <div className="bracket-controls">
              <Dropdown
                value={model === 'all' ? MODELS[0].id : model}
                options={MODELS.map((md) => ({
                  value: md.id,
                  label: md.name,
                  icon: md.id === 'claude' ? '🟠' : md.id === 'gpt' ? '🟢' : '🟣',
                }))}
                onChange={setModel}
                placeholder="Select Model"
                className="dropdown-model"
              />
            </div>

            {/* Tournament Stats */}
            {(() => {
              const allResults = [...byTeams.values()].filter(r => r.state === 'post');
              let totalGoals = 0;
              let matchCount = 0;
              
              for (const r of allResults) {
                const [a, b] = r.score.split('–').map(s => parseInt(s, 10) || 0);
                totalGoals += a + b;
                matchCount++;
              }
              
              const avgGoals = matchCount > 0 ? (totalGoals / matchCount).toFixed(2) : '0.00';
              
              // Total matches in World Cup 2026: 72 group + 32 knockout = 104
              const TOTAL_MATCHES = 104;
              const remainingMatches = TOTAL_MATCHES - matchCount;
              const predictedTotalGoals = matchCount > 0 
                ? Math.round(totalGoals + (parseFloat(avgGoals) * remainingMatches))
                : 0;
              
              return (
                <div className="tournament-stats">
                  <div className="stat-item">
                    <span className="stat-value">{matchCount}/{TOTAL_MATCHES}</span>
                    <span className="stat-label">Matches Played</span>
                  </div>
                  <div className="stat-item highlight">
                    <span className="stat-value">⚽ {totalGoals}</span>
                    <span className="stat-label">Goals So Far</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{avgGoals}</span>
                    <span className="stat-label">Per Match</span>
                  </div>
                  {matchCount > 0 && (
                    <div className="stat-item predicted">
                      <span className="stat-value">🎯 ~{predictedTotalGoals}</span>
                      <span className="stat-label">Predicted Total</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {(() => {
              const selectedModel = MODELS.find(m => m.id === model) || MODELS[0];
              const knockoutMatches = selectedModel.matches.filter(m => m.stage !== 'group');
              
              const getMatchesByStage = (stage: string) => 
                knockoutMatches.filter(m => m.stage === stage).sort((a, b) => a.slot - b.slot);
              
              const r32 = getMatchesByStage('r32');
              const r16 = getMatchesByStage('r16');
              const qf = getMatchesByStage('qf');
              const sf = getMatchesByStage('sf');
              const bronze = getMatchesByStage('bronze');
              const final = getMatchesByStage('final');

              // Group stage summary - who advances from each group
              const groups = selectedModel.groups;

              const BracketMatch = ({ match }: { match: MatchPrediction }) => {
                // Only look up results for knockout matches if we have an ESPN ID
                // This prevents group stage results from showing in knockout rounds
                const espnId = espnIdFromMatchId(match.id);
                const actual = espnId ? byId.get(espnId) : undefined;
                const hasResult = actual?.state === 'post';
                const actualWinner = hasResult ? actual.winner : null;
                
                return (
                  <div className={`bracket-match ${hasResult ? 'completed' : 'predicted'}`}>
                    <div className={`bracket-team ${hasResult && actualWinner === match.teamA ? 'actual-winner' : ''} ${hasResult && actualWinner !== match.teamA && actualWinner ? 'actual-loser' : ''} ${!hasResult && match.winner === match.teamA ? 'pred-winner' : ''}`}>
                      <TeamFlag team={match.teamA} size={20} />
                      <span className="team-name">{match.teamA}</span>
                      {hasResult && <span className="team-score">{actual.score.split('–')[0]}</span>}
                    </div>
                    <div className={`bracket-team ${hasResult && actualWinner === match.teamB ? 'actual-winner' : ''} ${hasResult && actualWinner !== match.teamB && actualWinner ? 'actual-loser' : ''} ${!hasResult && match.winner === match.teamB ? 'pred-winner' : ''}`}>
                      <TeamFlag team={match.teamB} size={20} />
                      <span className="team-name">{match.teamB}</span>
                      {hasResult && <span className="team-score">{actual.score.split('–')[1]}</span>}
                    </div>
                  </div>
                );
              };

              const GroupCard = ({ group }: { group: typeof groups[0] }) => {
                // Use live standings if available, otherwise fall back to predictions
                const liveStandings = computeGroupStandings(group.letter, group.teams, byTeams);
                const hasLiveData = liveStandings.some(s => s.played > 0);
                
                // Get teams in order (live or predicted)
                const orderedTeams = hasLiveData 
                  ? liveStandings.map(s => s.team)
                  : group.teams;
                
                const thirdPlace = orderedTeams[2];
                const isBestThird = selectedModel.bestThird.includes(thirdPlace);
                
                return (
                  <div className={`bracket-group ${hasLiveData ? 'live-data' : ''}`}>
                    <span className="group-letter">
                      Group {group.letter}
                      {hasLiveData && <span className="live-indicator">LIVE</span>}
                    </span>
                    <div className="group-teams">
                      {orderedTeams.map((team, idx) => {
                        const standing = hasLiveData ? liveStandings.find(s => s.team === team) : null;
                        const advances = idx < 2 || (idx === 2 && isBestThird);
                        return (
                          <div key={team} className={`group-team-slot ${advances ? 'advances' : 'eliminated'}`}>
                            <TeamFlag team={team} size={16} />
                            <span className="team-name">{team}</span>
                            {standing && <span className="pts-badge">{standing.pts}pts</span>}
                            {idx < 2 && <span className="pos-badge">{idx + 1}</span>}
                            {idx === 2 && isBestThird && <span className="pos-badge third">3rd</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              };

              // Split groups into top bracket (A-F) and bottom bracket (G-L)
              const topGroups = groups.filter(g => ['A', 'B', 'C', 'D', 'E', 'F'].includes(g.letter));
              const bottomGroups = groups.filter(g => ['G', 'H', 'I', 'J', 'K', 'L'].includes(g.letter));
              
              // Split R32 matches (first 8 = top bracket, last 8 = bottom bracket)
              const r32Top = r32.slice(0, 8);
              const r32Bottom = r32.slice(8, 16);
              
              // Split R16 matches
              const r16Top = r16.slice(0, 4);
              const r16Bottom = r16.slice(4, 8);
              
              // Split QF matches
              const qfTop = qf.slice(0, 2);
              const qfBottom = qf.slice(2, 4);

              return (
                <div className="bracket-wrapper">
                  {/* Top Half Bracket */}
                  <div className="bracket-half top-half">
                    <div className="bracket-container">
                      <div className="bracket-round groups-col">
                        <h4 className="round-title">Groups A-F</h4>
                        <div className="groups-list">
                          {topGroups.map((g) => <GroupCard key={g.letter} group={g} />)}
                        </div>
                      </div>

                      <div className="bracket-round r32-col">
                        <h4 className="round-title">R32</h4>
                        {r32Top.map((m) => <BracketMatch key={m.id} match={m} />)}
                      </div>
                      
                      <div className="bracket-round r16-col">
                        <h4 className="round-title">R16</h4>
                        {r16Top.map((m) => <BracketMatch key={m.id} match={m} />)}
                      </div>
                      
                      <div className="bracket-round qf-col">
                        <h4 className="round-title">QF</h4>
                        {qfTop.map((m) => <BracketMatch key={m.id} match={m} />)}
                      </div>
                      
                      <div className="bracket-round sf-col">
                        <h4 className="round-title">SF</h4>
                        {sf.slice(0, 1).map((m) => <BracketMatch key={m.id} match={m} />)}
                      </div>
                    </div>
                  </div>

                  {/* Final Section */}
                  <div className="bracket-final-section">
                    <div className="champion-display">
                      <span className="champion-label">🏆 Champion</span>
                      <div className="champion-team">
                        <TeamFlag team={selectedModel.champion} size={40} />
                        <span>{selectedModel.champion}</span>
                      </div>
                      <span className="final-score">{selectedModel.finalScore}</span>
                    </div>
                    
                    <div className="final-match">
                      <h4 className="round-title">Final</h4>
                      {final.map((m) => <BracketMatch key={m.id} match={m} />)}
                    </div>
                    
                    <div className="bronze-match">
                      <h4 className="round-title">3rd Place</h4>
                      {bronze.map((m) => <BracketMatch key={m.id} match={m} />)}
                    </div>
                  </div>

                  {/* Bottom Half Bracket */}
                  <div className="bracket-half bottom-half">
                    <div className="bracket-container">
                      <div className="bracket-round groups-col">
                        <h4 className="round-title">Groups G-L</h4>
                        <div className="groups-list">
                          {bottomGroups.map((g) => <GroupCard key={g.letter} group={g} />)}
                        </div>
                      </div>

                      <div className="bracket-round r32-col">
                        <h4 className="round-title">R32</h4>
                        {r32Bottom.map((m) => <BracketMatch key={m.id} match={m} />)}
                      </div>
                      
                      <div className="bracket-round r16-col">
                        <h4 className="round-title">R16</h4>
                        {r16Bottom.map((m) => <BracketMatch key={m.id} match={m} />)}
                      </div>
                      
                      <div className="bracket-round qf-col">
                        <h4 className="round-title">QF</h4>
                        {qfBottom.map((m) => <BracketMatch key={m.id} match={m} />)}
                      </div>
                      
                      <div className="bracket-round sf-col">
                        <h4 className="round-title">SF</h4>
                        {sf.slice(1, 2).map((m) => <BracketMatch key={m.id} match={m} />)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

      </main>
    </div>
  );
}
