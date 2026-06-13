import { useState } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'theme';

function systemTheme(): Theme {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStored(): Theme {
  const s = localStorage.getItem(KEY);
  return s === 'dark' || s === 'light' ? s : systemTheme();
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : '';
}

export function initTheme() {
  apply(readStored());
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );

  const setTheme = (next: Theme) => {
    setThemeState(next);
    localStorage.setItem(KEY, next);
    apply(next);
  };

  return { theme, setTheme };
}
