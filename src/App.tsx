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

interface Pick { m: MatchPrediction; md: ModelPrediction }

interface SlotGroup {
  key: string;
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

function fmtDateOption(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function stageInfo(stage: MatchPrediction['stage']) {
  return ALL_STAGES.find((s) => s.key === stage)!;
}

function ActualScore({ actual }: { actual: EspnResult }) {
  const aWin = actual.winner === actual.teamA;
  const bWin = actual.winner === actual.teamB;
  return (
    <div className="actual-row">
      <span className="actual-label">Result</span>
      <span className={aWin ? 'w' : actual.winner ? 'l' : ''}>{actual.teamA}</span>
      <span className="sc">{actual.score}</span>
      <span className={bWin ? 'w' : actual.winner ? 'l' : ''}>{actual.teamB}</span>
      {!actual.winner && actual.state === 'post' && <span className="draw-tag">Draw</span>}
    </div>
  );
}

function MiniFixture({ m }: { m: MatchPrediction }) {
  const aWin = m.winner === m.teamA;
  return (
    <span className="mini-fixture">
      <span className={aWin ? 'w' : 'l'}>{m.teamA}</span>
      <span className="sc">{m.score}</span>
      <span className={aWin ? 'l' : 'w'}>{m.teamB}</span>
    </span>
  );
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
}: {
  group: SlotGroup;
  timing: MatchTiming;
  now: number;
  actual?: EspnResult;
}) {
  const st = stageInfo(group.stage);
  const winners = group.picks.map((p) => p.m.winner);
  const consensus = winners.length > 1 && winners.every((w) => w === winners[0]);
  const stageLabel = group.stage === 'group' && group.groupLetter
    ? `Group ${group.groupLetter}`
    : st.label;

  return (
    <li className={`fixture timing-${timing}`} style={{ '--stage': st.color } as React.CSSProperties}>
      <div className="fixture-head">
        <div className="fixture-head-line1">
          <span className="stage-tag">{stageLabel}</span>
          <span className="fixture-matchup">
            <span className={actual?.winner === group.teamA ? 'w' : actual?.winner ? 'l' : ''}>{group.teamA}</span>
            <span className="vs">vs</span>
            <span className={actual?.winner === group.teamB ? 'w' : actual?.winner ? 'l' : ''}>{group.teamB}</span>
          </span>
          <div className="fixture-head-badges">
            <StatusBadge timing={timing} kickoff={group.kickoff} now={now} actual={actual} />
            {actual?.state === 'post' && consensus && actual.winner && (
              <span className="consensus">{group.picks.length}/{group.picks.length} → {winners[0]}</span>
            )}
            {actual?.state === 'post' && !consensus && (
              <span className="split-vote">Split</span>
            )}
          </div>
        </div>
        <div className="fixture-head-line2">
          <span className="date">{fmtKickoff(group.kickoff)}</span>
          {group.venue && <span className="venue-sep">·</span>}
          {group.venue && <span className="venue">{group.venue}</span>}
          {group.stage !== 'group' && (
            <>
              <span className="venue-sep">·</span>
              <span className="slot">Match #{group.slot + 1}</span>
            </>
          )}
        </div>
      </div>
      {actual && (actual.state === 'post' || actual.state === 'in') && (
        <ActualScore actual={actual} />
      )}
      <div className="picks">
        {group.picks.map(({ m, md }) => {
          const ok = actual ? predictionCorrect(m.winner, actual) : null;
          return (
            <div key={m.id} className={`pick ${md.id}`}>
              <span className="pick-name">{md.name}</span>
              <MiniFixture m={m} />
              <span className={`pick-conf ${pctClass(m.pct)}`}>{m.pct}%</span>
              {ok === true && <span className="ok">✓</span>}
              {ok === false && <span className="bad">✗</span>}
            </div>
          );
        })}
      </div>
    </li>
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
        <div className="group-row head">
          <span className="pos-col">Pos</span>
          <span className="team-col">Team</span>
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
      {hasResults && (
        <p className="group-legend">Live standings · strikeout = mathematically eliminated</p>
      )}
    </article>
  );
}

export default function App() {
  const [tab, setTab] = usePathTab();
  const [model, setModel] = useState('all');
  const [stage, setStage] = useState<'all' | ScheduleStage>('all');
  const [date, setDate] = useState('');
  const [team, setTeam] = useState('');
  const now = useNow();
  const { byId, byTeams, loading, error, lastFetchedAt, fetchMs, refresh, hasData } = useEspnResults();

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

        const key = model === 'all' ? slotKey(m) : `${slotKey(m)}|${m.teamA}|${m.teamB}`;
        if (!map.has(key)) {
          map.set(key, {
            key,
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
  }, [model, stage, date, team]);

  const groupCount = fixtures.filter((f) => f.stage === 'group').length;
  const knockoutCount = fixtures.filter((f) => f.stage !== 'group').length;
  const liveCount = fixtures.filter((f) => getTiming(f) === 'live').length;
  const scoredCount = accuracy.reduce((s, a) => s + a.total, 0);

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
            <button type="button" className="fetch-btn" onClick={refresh} disabled={loading}>
              {loading ? 'Fetching…' : 'Fetch results'}
            </button>
          </div>
        </div>

        {error && <p className="fetch-err">{error}</p>}
        {!hasData && !loading && !error && (
          <p className="fetch-hint">Click Fetch results to load live scores from ESPN</p>
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

        {(tab === 'schedule' || tab === 'accuracy') && (
          <div className="filter-bar">
            <select id="model-filter" className="filter-select" value={model} onChange={(e) => setModel(e.target.value)} aria-label="Model">
              <option value="all">All models</option>
              {MODELS.map((md) => (
                <option key={md.id} value={md.id}>{md.name}</option>
              ))}
            </select>
            {tab === 'schedule' && (
              <>
                <select id="stage-filter" className="filter-select" value={stage} onChange={(e) => setStage(e.target.value as 'all' | ScheduleStage)} aria-label="Stage">
                  <option value="all">All stages</option>
                  {ALL_STAGES.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
                <select id="date-filter" className="filter-select" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date">
                  <option value="">All dates</option>
                  {ALL_DATES.map((d) => <option key={d} value={d}>{fmtDateOption(d)}</option>)}
                </select>
              </>
            )}
            <select id="team-filter" className="filter-select filter-select-team" value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Team">
              <option value="">All teams</option>
              {ALL_TEAMS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {(date || team || stage !== 'all' || model !== 'all') && (
              <button
                type="button"
                className="filter-clear"
                onClick={() => {
                  setModel('all');
                  setStage('all');
                  setDate('');
                  setTeam('');
                }}
              >
                Reset
              </button>
            )}
          </div>
        )}
      </header>

      <main>
        {tab === 'schedule' && (
          <>
            {scoredCount > 0 && <AccuracyBoard scores={accuracy} />}
            <p className="meta">
              {groupCount} group · {knockoutCount} knockout
              {liveCount > 0 && ` · ${liveCount} live`}
              {scoredCount > 0 && ` · ${scoredCount} with results`}
            </p>
            <ul className="list">
              {fixtures.map((g) => {
                const actual = lookup(g);
                return (
                  <SlotCard
                    key={g.key}
                    group={g}
                    timing={getTiming(g)}
                    now={now}
                    actual={actual}
                  />
                );
              })}
            </ul>
            {!fixtures.length && <p className="empty">No matches — adjust filters</p>}
          </>
        )}

        {tab === 'accuracy' && (
          <>
            <AccuracyBoard scores={accuracy} />
            <p className="meta">✓ = predicted winner matched final result · ✗ = wrong · draws count as wrong for all models</p>
            <ul className="list">
              {fixtures
                .filter((g) => lookup(g)?.state === 'post')
                .map((g) => (
                  <SlotCard
                    key={g.key}
                    group={g}
                    timing="finished"
                    now={now}
                    actual={lookup(g)}
                  />
                ))}
            </ul>
            {!fixtures.some((g) => lookup(g)?.state === 'post') && (
              <p className="empty">
                {hasData
                  ? 'No completed matches yet — check back after kickoff'
                  : 'Click Fetch results to load live scores from ESPN'}
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
      </main>
    </div>
  );
}
