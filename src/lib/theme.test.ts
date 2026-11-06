import { describe, expect, it } from 'vitest';
import { nextTheme, parseTheme } from './theme';

describe('parseTheme', () => {
  it('accepts the three themes', () => {
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('system')).toBe('system');
  });

  it('falls back to system for a missing or unknown value', () => {
    expect(parseTheme(undefined)).toBe('system');
    expect(parseTheme(null)).toBe('system');
    expect(parseTheme('')).toBe('system');
    expect(parseTheme('Dark')).toBe('system');
    expect(parseTheme('sepia')).toBe('system');
  });
});

describe('nextTheme', () => {
  it('cycles system, light, dark and back to system', () => {
    expect(nextTheme('system')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
  });
});
