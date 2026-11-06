import { describe, expect, it } from 'vitest';
import { addMinutesToClock, isAfter, nextHalfHour, toDateKey } from './clock';

describe('nextHalfHour', () => {
  it('rounds up to the next half hour', () => {
    expect(nextHalfHour('10:05')).toBe('10:30');
    expect(nextHalfHour('10:29')).toBe('10:30');
    expect(nextHalfHour('10:45')).toBe('11:00');
  });

  it('moves on from a time that is already on the half hour', () => {
    expect(nextHalfHour('10:00')).toBe('10:30');
    expect(nextHalfHour('10:30')).toBe('11:00');
  });

  it('stays within the day', () => {
    expect(nextHalfHour('23:40')).toBe('23:59');
  });
});

describe('addMinutesToClock', () => {
  it('adds minutes across the hour', () => {
    expect(addMinutesToClock('10:30', 60)).toBe('11:30');
    expect(addMinutesToClock('09:45', 30)).toBe('10:15');
  });

  it('stops at 23:59 instead of wrapping', () => {
    expect(addMinutesToClock('23:30', 60)).toBe('23:59');
  });
});

describe('isAfter', () => {
  it('compares times within a day', () => {
    expect(isAfter('11:00', '10:30')).toBe(true);
    expect(isAfter('10:30', '10:30')).toBe(false);
    expect(isAfter('09:00', '10:30')).toBe(false);
  });
});

describe('toDateKey', () => {
  it("gives the calendar date in the visitor's timezone", () => {
    // 22:00 UTC on 5 Nov is already 6 Nov in Melbourne (+11).
    const instant = new Date('2026-11-05T22:00:00Z');
    expect(toDateKey(instant, 'Australia/Melbourne')).toBe('2026-11-06');
    expect(toDateKey(instant, 'UTC')).toBe('2026-11-05');
  });
});
