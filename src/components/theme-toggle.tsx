'use client';

import { useState } from 'react';
import { nextTheme, THEME_COOKIE, type Theme } from '@/lib/theme';

const LABELS: Record<Theme, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

/**
 * Cycles the colour theme between System, Light and Dark. The choice is saved
 * in a cookie so the server renders the right theme on the next visit, and is
 * applied straight away by setting data-theme on <html> (see globals.css).
 */
export function ThemeToggle({ initialTheme }: { initialTheme: Theme }) {
  const [theme, setTheme] = useState(initialTheme);

  function handleClick() {
    const next = nextTheme(theme);
    setTheme(next);
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    if (next === 'system') {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = next;
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Theme: ${LABELS[theme]}. Switch to ${LABELS[nextTheme(theme)]}.`}
      title={`Theme: ${LABELS[theme]}`}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-subtle px-3 text-sm font-medium text-ink transition hover:border-muted focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
    >
      <ThemeIcon theme={theme} />
      <span className="hidden sm:inline">{LABELS[theme]}</span>
    </button>
  );
}

function ThemeIcon({ theme }: { theme: Theme }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  } as const;

  if (theme === 'dark') {
    return (
      <svg {...common} fill="currentColor">
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
      </svg>
    );
  }

  if (theme === 'light') {
    return (
      <svg
        {...common}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }

  return (
    <svg
      {...common}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}
