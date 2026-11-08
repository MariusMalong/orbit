import { describe, expect, it } from 'vitest';
import {
  MAX_PROJECT_NAME_LENGTH,
  nextProjectColor,
  parseProjectColor,
  parseProjectName,
  plannedByProject,
} from './projects';

describe('parseProjectName', () => {
  it('trims and tidies spaces', () => {
    expect(parseProjectName('  Thesis   writing ')).toBe('Thesis writing');
  });

  it('rejects empty, too long and non-text names', () => {
    expect(parseProjectName('   ')).toBeNull();
    expect(
      parseProjectName('x'.repeat(MAX_PROJECT_NAME_LENGTH + 1))
    ).toBeNull();
    expect(parseProjectName(null)).toBeNull();
  });
});

describe('parseProjectColor', () => {
  it('keeps a known colour and falls back to teal', () => {
    expect(parseProjectColor('rose')).toBe('rose');
    expect(parseProjectColor('chartreuse')).toBe('teal');
    expect(parseProjectColor(null)).toBe('teal');
  });
});

describe('nextProjectColor', () => {
  it('picks the first unused colour, then cycles', () => {
    expect(nextProjectColor([])).toBe('teal');
    expect(nextProjectColor(['teal', 'violet'])).toBe('blue');
    expect(
      nextProjectColor(['teal', 'blue', 'violet', 'rose', 'amber', 'green'])
    ).toBe('teal');
  });
});

describe('plannedByProject', () => {
  const thesis = { id: 'p1', name: 'Thesis', color: 'violet' as const };
  const client = { id: 'p2', name: 'Client', color: 'blue' as const };
  const idle = { id: 'p3', name: 'Idle', color: 'rose' as const };
  const block = (taskId: string, hours: number) => ({
    taskId,
    startTime: new Date(0),
    endTime: new Date(hours * 3_600_000),
  });

  it('adds up planned time per project, with no-project time last', () => {
    expect(
      plannedByProject(
        [block('a', 2), block('b', 1), block('a', 1), block('loose', 0.5)],
        [thesis, client, idle],
        { a: thesis, b: client }
      )
    ).toEqual([
      { project: thesis, minutes: 180 },
      { project: client, minutes: 60 },
      { project: null, minutes: 30 },
    ]);
  });
});
