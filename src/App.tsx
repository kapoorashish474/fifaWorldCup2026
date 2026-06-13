import { useMemo, useState } from 'react';
import { ACTUALS } from './data/actuals';
import {
  MODELS,
  STAGES,
  confidencePct,
  type MatchPrediction,
  type ModelPrediction,
} from './data/predictions';

type Tab = 'matches' | 'groups' | 'outright';

function MatchLine({ m }: { m: MatchPrediction }) {
  const aWin = m.winner === m.teamA;
  return (
    <div className="line">
      <span className={aWin ? 'w' : 'l'}>{m.teamA}</span>
      <span className="score">{m.score}</span>
      <span className={aWin ? 'l' : 'w'}>{m.teamB}</span>
    </div>
  );
}

function MatchItem({ m, model }: { m: MatchPrediction; model: ModelPrediction }) {
  const actual = ACTUALS.find((a) => a.matchId === m.id);
  const ok = actual ? actual.winner === m.winner : null;
  const stage = STAGES.find((s) => s.key === m.stage)?.label ?? m.stage;

  return (
    <li className="item">
      <div className="item-head">
        <span className={`src ${model.id}`}>{model.name}</span>
        <span className="stage">{stage}</span>
        <span className="pct">{confidencePct(m.confidence)}%</span>
      </div>
      <MatchLine m={m} />
      {actual && (
        <p className={`check ${ok ? 'ok' : 'bad'}`}>
          Actual: {actual.winner} {actual.score} {ok ? '✓' : '✗'}
        </p>
      )}
    </li>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('matches');
  const [model, setModel] = useState<string>('all');
  const [stage, setStage] = useState<string>('all');
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return MODELS.filter((m) => model === 'all' || m.id === model).flatMap((md) =>
      md.matches
        .filter((m) => stage === 'all' || m.stage === stage)
        .filter((m) => !query || `${m.teamA} ${m.teamB} ${md.name}`.toLowerCase().includes(query))
        .map((m) => ({ m, md })),
    );
  }, [model, stage, q]);

  const groups = useMemo(
    () => MODELS.filter((m) => model === 'all' || m.id === model),
    [model],
  );

  return (
    <div className="page">
      <header>
        <div>
          <h1>FIFA World Cup 2026</h1>
          <p>LLM knockout predictions · Claude · GPT · Gemini</p>
        </div>
        <input
          className="search"
          type="search"
          placeholder="Search team…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </header>

      <div className="bar">
        <div className="pills">
          {(['matches', 'groups', 'outright'] as Tab[]).map((t) => (
            <button key={t} type="button" className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
              {t === 'matches' ? 'Knockout' : t === 'groups' ? 'Groups' : 'Winners'}
            </button>
          ))}
        </div>
        <div className="pills">
          <button type="button" className={model === 'all' ? 'on' : ''} onClick={() => setModel('all')}>All</button>
          {MODELS.map((m) => (
            <button key={m.id} type="button" className={model === m.id ? 'on' : ''} onClick={() => setModel(m.id)}>
              {m.name}
            </button>
          ))}
        </div>
        {tab === 'matches' && (
          <div className="pills scroll">
            <button type="button" className={stage === 'all' ? 'on' : ''} onClick={() => setStage('all')}>All stages</button>
            {STAGES.map((s) => (
              <button key={s.key} type="button" className={stage === s.key ? 'on' : ''} onClick={() => setStage(s.key)}>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <main>
        {tab === 'matches' && (
          <>
            <p className="meta">{list.length} predictions · <span className="w">green</span> = through · <span className="l">red</span> = out</p>
            <ul className="list">
              {list.map(({ m, md }) => (
                <MatchItem key={m.id} m={m} model={md} />
              ))}
            </ul>
            {!list.length && <p className="empty">Nothing matched — try another filter</p>}
          </>
        )}

        {tab === 'groups' && (
          <div className="groups">
            {groups.map((md) => (
              <section key={md.id}>
                <h2 className={md.id}>{md.name}</h2>
                <div className="grid">
                  {md.groups.map((g) => (
                    <div key={g.letter} className="g">
                      <h3>Group {g.letter}</h3>
                      {g.teams.map((team, i) => {
                        const ok = i < 2 || (i === 2 && md.bestThird.includes(team));
                        return (
                          <div key={team} className={ok ? 'w' : 'l'}>
                            {i + 1}. {team}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {tab === 'outright' && (
          <div className="outright">
            {MODELS.map((md) => (
              <article key={md.id} className="card">
                <span className={`src ${md.id}`}>{md.name}</span>
                <p className="champ w">🏆 {md.champion}</p>
                <p className="sub">Final vs {md.runnerUp} · {md.finalScore}</p>
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
