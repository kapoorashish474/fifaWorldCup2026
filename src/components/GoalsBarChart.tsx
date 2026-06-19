export interface MatchGoalBar {
  id: string;
  label: string;
  score: string;
  goals: number;
  date: string;
  dateLabel: string;
}

const PLOT_HEIGHT = 200;

export function GoalsBarChart({
  matches,
  emptyMessage,
}: {
  matches: MatchGoalBar[];
  emptyMessage?: string;
}) {
  if (matches.length === 0) {
    return (
      <p className="no-data no-data-compact">
        {emptyMessage ?? 'No completed matches yet — click Refresh to load scores.'}
      </p>
    );
  }

  const maxGoals = Math.max(6, ...matches.map((m) => m.goals));
  const totalGoals = matches.reduce((s, m) => s + m.goals, 0);
  const avgNum = totalGoals / matches.length;
  const avg = avgNum.toFixed(2);
  const avgLinePct = (avgNum / maxGoals) * 100;

  return (
    <div className="goals-chart-wrap">
      <div className="goals-chart-meta">
        <span>{matches.length} matches</span>
        <span>{totalGoals} total goals</span>
        <span>{avg} avg / match</span>
      </div>
      <div className="goals-chart" role="img" aria-label="Bar chart of goals per match">
        <div className="goals-chart-scroll">
          <div className="goals-chart-plots" style={{ height: PLOT_HEIGHT }}>
            <div
              className="goals-avg-line"
              style={{ bottom: `${avgLinePct}%` }}
              title={`Tournament average: ${avg} goals per match`}
            >
              <span className="goals-avg-label">avg {avg}</span>
            </div>
            {matches.map((m) => {
              const heightPct = m.goals === 0 ? 3 : (m.goals / maxGoals) * 100;
              const hot = m.goals >= 5;
              return (
                <div
                  key={m.id}
                  className="goals-bar-col"
                  title={`${m.label} · ${m.score} · ${m.date}`}
                >
                  <span className="goals-bar-value">{m.goals}</span>
                  <div
                    className={`goals-bar ${hot ? 'hot' : ''}`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="goals-chart-labels">
            {matches.map((m) => (
              <div key={m.id} className="goals-label-col">
                <span className="goals-bar-score">{m.score}</span>
                <span className="goals-bar-label">{m.label}</span>
                <span className="goals-bar-date">{m.dateLabel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
