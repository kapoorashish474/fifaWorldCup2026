import { useCallback, useMemo, useState } from 'react';
import {
  ALL_DATES,
  ALL_STAGES,
  GROUP_LETTERS,
  MODELS,
  TOURNAMENT_END,
  TOURNAMENT_START,
  pctClass,
  slotKey,
  type MatchPrediction,
  type ModelPrediction,
  type ScheduleStage,
} from './data/predictions';
import {
  accuracyPct,
  computeModelAccuracy,
  espnIdFromMatchId,
  lookupResult,
  predictionCorrect,
  resolveTiming,
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
import { useEspnResults, useNow } from './lib/useScheduleClock';

type Tab = 'matches' | 'groups' | 'outright' | 'accuracy';

interface Pick { m: MatchPrediction; md: ModelPrediction }

interface SlotGroup {
  key: string;
  stage: MatchPrediction['stage'];
  kickoff: string;
  slot: number;
  groupLetter?: string;
  espnId?: string;
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
    return <span className="timing timing-finished">FT · {actual.score}</span>;
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
  return <span className="timing timing-finished">FT</span>;
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
        <span className="stage-tag">{stageLabel}</span>
        <span className="date">{fmtKickoff(group.kickoff)}</span>
        <StatusBadge timing={timing} kickoff={group.kickoff} now={now} actual={actual} />
        {group.stage !== 'group' && <span className="slot">#{group.slot + 1}</span>}
        {actual?.state === 'post' && consensus && actual.winner && (
          <span className="consensus">{group.picks.length}/{group.picks.length} → {winners[0]}</span>
        )}
        {actual?.state === 'post' && !consensus && (
          <span className="split-vote">Split</span>
        )}
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

function GroupCard({ letter }: { letter: string }) {
  const group = MODELS[0].groups.find((g) => g.letter === letter)!;

  return (
    <article className="group-card">
      <h3>Group {letter}</h3>
      <div className="group-table">
        <div className="group-row head">
          <span>Pos</span>
          <span>Team</span>
          {MODELS.map((md) => (
            <span key={md.id} className={`col-h ${md.id}`}>{md.name}</span>
          ))}
        </div>
        {group.teams.map((team, i) => (
          <div key={team} className="group-row">
            <span className="pos">{i + 1}</span>
            <span className="team-name">{team}</span>
            {MODELS.map((md) => {
              const through = i < 2 || (i === 2 && md.bestThird.includes(team));
              return (
                <span key={md.id} className={`status ${through ? 'w' : 'l'}`}>
                  {through ? (i === 2 ? '3rd ✓' : 'Through') : 'Out'}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </article>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('matches');
  const [model, setModel] = useState('all');
  const [stage, setStage] = useState<'all' | ScheduleStage>('all');
  const [date, setDate] = useState('');
  const [q, setQ] = useState('');
  const now = useNow();
  const { byId, byTeams } = useEspnResults();

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
    const query = q.trim().toLowerCase();
    const active = MODELS.filter((md) => model === 'all' || md.id === model);
    const map = new Map<string, SlotGroup>();

    for (const md of active) {
      for (const m of md.matches) {
        if (stage !== 'all' && stage !== m.stage) continue;
        if (date && localDateKey(m.kickoff) !== date) continue;
        if (query && !`${m.teamA} ${m.teamB}`.toLowerCase().includes(query)) continue;

        const key = model === 'all' ? slotKey(m) : `${slotKey(m)}|${m.teamA}|${m.teamB}`;
        if (!map.has(key)) {
          map.set(key, {
            key,
            stage: m.stage,
            kickoff: m.kickoff,
            slot: m.slot,
            groupLetter: m.group,
            espnId: espnIdFromMatchId(m.id),
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
  }, [model, stage, date, q]);

  const groupCount = fixtures.filter((f) => f.stage === 'group').length;
  const knockoutCount = fixtures.filter((f) => f.stage !== 'group').length;
  const liveCount = fixtures.filter((f) => getTiming(f) === 'live').length;
  const scoredCount = accuracy.reduce((s, a) => s + a.total, 0);

  return (
    <div className="page">
      <header>
        <h1>FIFA World Cup 2026</h1>
        <input className="search" type="search" placeholder="Search team…" value={q} onChange={(e) => setQ(e.target.value)} />
      </header>

      <div className="filters">
        <div className="pills">
          {(['matches', 'accuracy', 'groups', 'outright'] as Tab[]).map((t) => (
            <button key={t} type="button" className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
              {t === 'matches' ? 'Schedule' : t === 'accuracy' ? 'Accuracy' : t === 'groups' ? 'Groups' : 'Winners'}
            </button>
          ))}
        </div>
        <div className="pills">
          <button type="button" className={model === 'all' ? 'on' : ''} onClick={() => setModel('all')}>All</button>
          {MODELS.map((md) => (
            <button key={md.id} type="button" className={`${model === md.id ? 'on' : ''} ${md.id}`} onClick={() => setModel(md.id)}>{md.name}</button>
          ))}
        </div>
        {tab === 'matches' && (
          <>
            <div className="pills scroll">
              <button type="button" className={stage === 'all' ? 'on' : ''} onClick={() => setStage('all')}>All stages</button>
              {ALL_STAGES.map((s) => (
                <button key={s.key} type="button" className={stage === s.key ? 'on' : ''} onClick={() => setStage(s.key)}>{s.label}</button>
              ))}
            </div>
            <select value={date} onChange={(e) => setDate(e.target.value)}>
              <option value="">All dates</option>
              {ALL_DATES.map((d) => <option key={d} value={d}>{fmtDateOption(d)}</option>)}
            </select>
            <input type="date" min={TOURNAMENT_START} max={TOURNAMENT_END} value={date} onChange={(e) => setDate(e.target.value)} />
            {date && <button type="button" className="link" onClick={() => setDate('')}>Clear</button>}
          </>
        )}
      </div>

      <main>
        {tab === 'matches' && (
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
              <p className="empty">No completed matches yet — check back after kickoff</p>
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
              {GROUP_LETTERS.map((letter) => <GroupCard key={letter} letter={letter} />)}
            </div>
          </>
        )}

        {tab === 'outright' && (
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
