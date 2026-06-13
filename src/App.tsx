import { useMemo, useState } from 'react';
import { actualResults } from './data/actuals';
import {
  TOURNAMENT_END,
  TOURNAMENT_START,
  computeAccuracy,
  models,
  type MatchPrediction,
  type ModelPrediction,
} from './data/predictions';

type View = 'matches' | 'groups' | 'champions';
type StageFilter = 'all' | MatchPrediction['stage'];

const STAGE_LABEL: Record<MatchPrediction['stage'], string> = {
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarterfinal',
  sf: 'Semifinal',
  bronze: 'Bronze',
  final: 'Final',
};

const MODEL_COLORS: Record<string, string> = {
  claude: '#d97706',
  gpt: '#10b981',
  gemini: '#6366f1',
};

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function confidenceClass(pct: number) {
  if (pct >= 80) return 'conf-high';
  if (pct >= 55) return 'conf-moderate';
  return 'conf-low';
}

function MatchCard({
  match,
  model,
  actual,
}: {
  match: MatchPrediction;
  model: ModelPrediction;
  actual?: { actualWinner: string; actualScore: string };
}) {
  const correct = actual ? actual.actualWinner === match.predictedWinner : null;

  return (
    <article className={`match-card ${correct === true ? 'correct' : correct === false ? 'wrong' : ''}`}>
      <div className="match-card-top">
        <span className="match-date">{formatDate(match.date)}</span>
        <span className="stage-pill">{STAGE_LABEL[match.stage]}</span>
        <span className="model-pill" style={{ '--model-color': MODEL_COLORS[model.id] } as React.CSSProperties}>
          {model.label}
        </span>
      </div>
      <div className="match-fixture">
        <span className={match.predictedWinner === match.teamA ? 'team winner' : 'team'}>{match.teamA}</span>
        <span className="fixture-vs">vs</span>
        <span className={match.predictedWinner === match.teamB ? 'team winner' : 'team'}>{match.teamB}</span>
      </div>
      <div className="match-card-bottom">
        <div className="prediction">
          <span className="pred-label">Pick</span>
          <strong>{match.predictedWinner}</strong>
          <span className="pred-score">{match.predictedScore}</span>
        </div>
        <div className={`conf-meter ${confidenceClass(match.confidencePct)}`}>
          <div className="conf-bar" style={{ width: `${match.confidencePct}%` }} />
          <span>{match.confidencePct}%</span>
        </div>
      </div>
      {actual && (
        <div className="actual-row">
          Actual: <strong>{actual.actualWinner}</strong> {actual.actualScore}
          <span className={`verdict ${correct ? 'ok' : 'miss'}`}>{correct ? 'Correct' : 'Miss'}</span>
        </div>
      )}
    </article>
  );
}

export default function App() {
  const [view, setView] = useState<View>('matches');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [activeModel, setActiveModel] = useState('all');

  const visibleModels = activeModel === 'all' ? models : models.filter((m) => m.id === activeModel);

  const allMatches = useMemo(
    () =>
      visibleModels.flatMap((model) =>
        model.matches.map((match) => ({
          model,
          match,
          actual: actualResults.find((a) => a.matchId === match.id),
        })),
      ),
    [visibleModels],
  );

  const filteredMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allMatches
      .filter(({ match, model }) => {
        if (stageFilter !== 'all' && match.stage !== stageFilter) return false;
        if (dateFilter && match.date !== dateFilter) return false;
        if (!q) return true;
        const haystack = [match.teamA, match.teamB, match.predictedWinner, model.label, STAGE_LABEL[match.stage], match.date]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => a.match.date.localeCompare(b.match.date) || a.model.label.localeCompare(b.model.label));
  }, [allMatches, search, stageFilter, dateFilter]);

  const matchDates = useMemo(
    () => [...new Set(allMatches.map(({ match }) => match.date))].sort(),
    [allMatches],
  );

  const accuracy = useMemo(
    () => models.map((model) => ({ model, ...computeAccuracy(model, actualResults) })),
    [],
  );

  const hasAnyActuals = actualResults.length > 0;

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-inner">
          <p className="eyebrow">USA · Canada · Mexico · Jun 11 – Jul 19, 2026</p>
          <h1>FIFA World Cup 2026</h1>
          <p className="subtitle">LLM prediction tracker — search matches, compare models, track accuracy</p>
        </div>
      </header>

      <nav className="view-nav">
        {(['matches', 'groups', 'champions'] as View[]).map((v) => (
          <button key={v} type="button" className={view === v ? 'active' : ''} onClick={() => setView(v)}>
            {v === 'matches' ? 'All Matches' : v === 'groups' ? 'Groups' : 'Winners'}
          </button>
        ))}
      </nav>

      <section className="toolbar card">
        <div className="search-wrap">
          <input
            type="search"
            placeholder="Search team, country, stage, or model…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search matches"
          />
          {search && (
            <button type="button" className="clear-btn" onClick={() => setSearch('')} aria-label="Clear search">
              ×
            </button>
          )}
        </div>

        <div className="filters">
          <div className="filter-row">
            <span className="filter-label">Model</span>
            <div className="pill-group">
              <button type="button" className={activeModel === 'all' ? 'active' : ''} onClick={() => setActiveModel('all')}>
                All
              </button>
              {models.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={activeModel === m.id ? 'active' : ''}
                  onClick={() => setActiveModel(m.id)}
                  style={{ '--model-color': MODEL_COLORS[m.id] } as React.CSSProperties}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {view === 'matches' && (
            <>
              <div className="filter-row">
                <span className="filter-label">Stage</span>
                <div className="pill-group">
                  <button type="button" className={stageFilter === 'all' ? 'active' : ''} onClick={() => setStageFilter('all')}>
                    All
                  </button>
                  {(Object.keys(STAGE_LABEL) as MatchPrediction['stage'][]).map((s) => (
                    <button key={s} type="button" className={stageFilter === s ? 'active' : ''} onClick={() => setStageFilter(s)}>
                      {STAGE_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-row">
                <span className="filter-label">Date</span>
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                  <option value="">All dates</option>
                  {matchDates.map((d) => (
                    <option key={d} value={d}>
                      {formatDate(d)}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  min={TOURNAMENT_START}
                  max={TOURNAMENT_END}
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  aria-label="Pick date"
                />
                {dateFilter && (
                  <button type="button" className="text-btn" onClick={() => setDateFilter('')}>
                    Clear date
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {hasAnyActuals && (
        <section className="card accuracy-section">
          <h2>Prediction accuracy</h2>
          <div className="accuracy-grid">
            {accuracy.map(({ model, correct, total, pct }) => (
              <div key={model.id} className="accuracy-card" style={{ '--model-color': MODEL_COLORS[model.id] } as React.CSSProperties}>
                <span className="acc-label">{model.label}</span>
                <span className="acc-pct">{pct !== null ? `${pct}%` : '—'}</span>
                <span className="acc-detail">{correct}/{total} correct</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {view === 'matches' && (
        <section className="card">
          <div className="section-head">
            <h2>Match predictions</h2>
            <span className="count-badge">{filteredMatches.length} matches</span>
          </div>
          {filteredMatches.length > 0 ? (
            <div className="match-grid">
              {filteredMatches.map(({ model, match, actual }) => (
                <MatchCard key={match.id} match={match} model={model} actual={actual} />
              ))}
            </div>
          ) : (
            <p className="empty">No matches match your search. Try a team name like &quot;Brazil&quot; or clear filters.</p>
          )}
        </section>
      )}

      {view === 'groups' && (
        <section className="card">
          <h2>Group stage predictions</h2>
          <div className="groups-grid">
            {visibleModels.map((model) => (
              <div key={model.id} className="group-block">
                <h3 style={{ color: MODEL_COLORS[model.id] }}>{model.label}</h3>
                <div className="groups-inner">
                  {model.groups.map((g) => (
                    <div key={g.group} className="group-card">
                      <h4>Group {g.group}</h4>
                      <ol>
                        {g.positions.map((p) => (
                          <li key={p.pos}>
                            <span className="pos">{p.pos}.</span> {p.team}
                            <span className="status">{p.status}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {view === 'champions' && (
        <section className="card">
          <h2>Champion picks &amp; win probability</h2>
          <div className="champions-grid">
            {models.map((model) => (
              <div key={model.id} className="champion-card" style={{ '--model-color': MODEL_COLORS[model.id] } as React.CSSProperties}>
                <div className="champion-header">
                  <span className="model-name">{model.label}</span>
                  <span className={`confidence ${confidenceClass(model.champion.confidencePct)}`}>
                    {model.champion.confidencePct}%
                  </span>
                </div>
                <div className="champion-pick">🏆 {model.champion.team}</div>
                <div className="champion-detail">vs {model.champion.vs} · {model.champion.score}</div>
                <ul className="prob-list">
                  {model.winnerProbabilities.map((w) => (
                    <li key={w.team}>
                      <span className="prob-team">{w.team}</span>
                      <div className="prob-bar-wrap">
                        <div className="prob-bar" style={{ width: `${Math.min(w.pct * 4, 100)}%` }} />
                      </div>
                      <span className="prob-pct">{w.pct}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer>
        <p>
          Update <code>src/data/actuals.ts</code> with real results · refresh <code>Analysis/</code> &amp;{' '}
          <code>src/data/predictions.ts</code> every few days
        </p>
      </footer>
    </div>
  );
}
