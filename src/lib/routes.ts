export type TabKey = 'schedule' | 'accuracy' | 'groups' | 'winners' | 'bets' | 'robinhood' | 'bracket';

export const TAB_PATHS: Record<TabKey, string> = {
  schedule: '/Schedule',
  accuracy: '/Accuracy',
  groups: '/Groups',
  winners: '/Winners',
  bets: '/Bets',
  robinhood: '/Robinhood',
  bracket: '/Bracket',
};

export const TAB_LABELS: Record<TabKey, string> = {
  schedule: 'Schedule',
  accuracy: 'Accuracy',
  groups: 'Groups',
  winners: 'Winners',
  bets: 'My Bets',
  robinhood: 'Robinhood',
  bracket: 'Bracket',
};

export const NAV_TABS: TabKey[] = ['schedule', 'accuracy', 'groups', 'winners', 'bets', 'robinhood', 'bracket'];

const PATH_TO_TAB = new Map(
  Object.entries(TAB_PATHS).map(([tab, path]) => [path.toLowerCase(), tab as TabKey]),
);

export function tabFromPath(pathname: string): TabKey | null {
  const normalized = pathname.replace(/\/$/, '') || '/';
  if (normalized === '/') return null;
  return PATH_TO_TAB.get(normalized.toLowerCase()) ?? null;
}

export function defaultTabPath(): string {
  return TAB_PATHS.schedule;
}
