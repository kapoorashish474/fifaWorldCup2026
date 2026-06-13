export type MatchTiming = 'upcoming' | 'live' | 'finished';

/** ~90 min + halftime + stoppage */
export const MATCH_WINDOW_MS = 105 * 60 * 1000;

export function localDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fmtKickoff(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function timingFromClock(kickoff: string, now = Date.now()): MatchTiming {
  const start = Date.parse(kickoff);
  if (Number.isNaN(start)) return 'upcoming';
  if (now < start) return 'upcoming';
  if (now < start + MATCH_WINDOW_MS) return 'live';
  return 'finished';
}

export function timingLabel(t: MatchTiming): string {
  if (t === 'live') return 'Live';
  if (t === 'finished') return 'Full time';
  return 'Upcoming';
}

export function msUntilKickoff(kickoff: string, now = Date.now()): number {
  return Math.max(0, Date.parse(kickoff) - now);
}

export function fmtCountdown(ms: number): string {
  if (ms <= 0) return '';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}
