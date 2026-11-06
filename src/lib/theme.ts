/** Cookie that remembers the visitor's colour theme. */
export const THEME_COOKIE = 'theme';

export const THEMES = ['system', 'light', 'dark'] as const;

/** "system" follows the device's light or dark setting. */
export type Theme = (typeof THEMES)[number];

/** Reads a cookie value, falling back to "system" for anything unexpected. */
export function parseTheme(value: string | undefined | null): Theme {
  return THEMES.find((theme) => theme === value) ?? 'system';
}

/** The theme a click on the switch moves to: system, then light, then dark. */
export function nextTheme(theme: Theme): Theme {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
}
