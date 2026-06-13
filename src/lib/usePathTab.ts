import { useCallback, useEffect, useState } from 'react';
import { defaultTabPath, TAB_PATHS, tabFromPath, type TabKey } from './routes';

export function usePathTab(): [TabKey, (tab: TabKey) => void] {
  const [tab, setTab] = useState<TabKey>(() => tabFromPath(window.location.pathname) ?? 'schedule');

  useEffect(() => {
    if (!tabFromPath(window.location.pathname)) {
      window.history.replaceState(null, '', defaultTabPath());
      setTab('schedule');
    }
  }, []);

  useEffect(() => {
    const onPop = () => setTab(tabFromPath(window.location.pathname) ?? 'schedule');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((next: TabKey) => {
    window.history.pushState(null, '', TAB_PATHS[next]);
    setTab(next);
  }, []);

  return [tab, navigate];
}
