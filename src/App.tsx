import { useMemo, useState } from 'react';
import { ACTUALS } from './data/actuals';
import {
  ALL_DATES,
  GROUP_LETTERS,
  MODELS,
  STAGES,
  TOURNAMENT_END,
  TOURNAMENT_START,
  pctClass,
  slotKey,
  type MatchPrediction,
  type ModelPrediction,
} from './data/predictions';

type Tab = 'matches' | 'groups' | 'outright';

interface Pick { m: MatchPrediction; md: ModelPrediction }

interface SlotGroup {
  key: string;
  stage: MatchPrediction['stage'];
  date: string;
  slot: number;
  picks: Pick[];
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function stageInfo(stage: MatchPrediction['stage']) {
  return STAGES.find((s) => s.key === stage)!;
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

function SlotCard({ group }: { group: SlotGroup }) {
  const st = stageInfo(group.stage);
  const winners = group.picks.map((p) => p.m.winner);
  const consensus = winners.length > 1 && winners.every((w) => w === winners[0]);

  return (
    <li className="fixture" style={{ '--stage': st.color } as React.CSSProperties}>
      <div className="fixture-head">
        <span className="stage-tag">{st.label}</span>
        <span className="date">{fmtDate(group.date)}</span>
        <span className="slot">#{group.slot + 1}</span>
        {consensus ? (
          <span className="consensus">{group.picks.length}/{group.picks.length} → {winners[0]}</span>
        ) : (
          <span className="split-vote">Split</span>
        )}
      </div>
      <div className="picks">
        {group.picks.map(({ m, md }) => {
          const actual = ACTUALS.find((a) => a.matchId === m.id);
          const ok = actual ? actual.winner === m.winner : null;
          return (
            <div key={m.id} className={`pick ${md.id}`}>
              <span className="pick-name">{md.name}</span>
              <MiniFixture m={m} />
              <span className={`pick-conf ${pctClass(m.pct)}`}>{m.pct}%</span>
              {actual && <span className={ok ? 'ok' : 'bad'}>{ok ? '✓' : '✗'}</span>}
            </div>
          );
        })}
      </div>
    </li>
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
  const [stage, setStage] = useState('all');
  const [date, setDate] = useState('');
  const [q, setQ] = useState('');

  const fixtures = useMemo(() => {
    const query = q.trim().toLowerCase();
    const active = MODELS.filter((md) => model === 'all' || md.id === model);
    const map = new Map<string, SlotGroup>();

    for (const md of active) {
      for (const m of md.matches) {
        if (stage !== 'all' && m.stage !== stage) continue;
        if (date && m.date !== date) continue;
        if (query && !`${m.teamA} ${m.teamB}`.toLowerCase().includes(query)) continue;

        const key = model === 'all' ? slotKey(m) : `${slotKey(m)}|${m.teamA}|${m.teamB}`;
        if (!map.has(key)) {
          map.set(key, { key, stage: m.stage, date: m.date, slot: m.slot, picks: [] });
        }
        map.get(key)!.picks.push({ m, md });
      }
    }

    for (const g of map.values()) {
      g.picks.sort((a, b) => a.md.name.localeCompare(b.md.name));
    }

    return [...map.values()].sort(
      (a, b) => a.date.localeCompare(b.date) || a.slot - b.slot,
    );
  }, [model, stage, date, q]);

  return (
    <div className="page">
      <header>
        <h1>FIFA World Cup 2026</h1>
        <input className="search" type="search" placeholder="Search team…" value={q} onChange={(e) => setQ(e.target.value)} />
      </header>

      <div className="filters">
        <div className="pills">
          {(['matches', 'groups', 'outright'] as Tab[]).map((t) => (
            <button key={t} type="button" className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t === 'matches' ? 'Knockout' : t === 'groups' ? 'Groups' : 'Winners'}</button>
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
              {STAGES.map((s) => (
                <button key={s.key} type="button" className={stage === s.key ? 'on' : ''} onClick={() => setStage(s.key)}>{s.label}</button>
              ))}
            </div>
            <select value={date} onChange={(e) => setDate(e.target.value)}>
              <option value="">All dates</option>
              {ALL_DATES.map((d) => <option key={d} value={d}>{fmtDate(d)}</option>)}
            </select>
            <input type="date" min={TOURNAMENT_START} max={TOURNAMENT_END} value={date} onChange={(e) => setDate(e.target.value)} />
            {date && <button type="button" className="link" onClick={() => setDate('')}>Clear</button>}
          </>
        )}
      </div>

      <main>
        {tab === 'matches' && (
          <>
            <p className="meta">{fixtures.length} bracket slots · all models per slot · confidence varies by match</p>
            <ul className="list">
              {fixtures.map((g) => <SlotCard key={g.key} group={g} />)}
            </ul>
            {!fixtures.length && <p className="empty">No matches — adjust filters</p>}
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
