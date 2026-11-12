import { describe, expect, it } from 'vitest';
import { afterFocus, focusMinutes, MAX_FOCUS_MINUTES } from './focus';

const at = (minutes: number) => new Date(Date.UTC(2026, 10, 13, 9, minutes));

describe('focusMinutes', () => {
  it('rounds to whole minutes', () => {
    expect(focusMinutes(at(0), new Date(at(25).getTime() + 20_000))).toBe(25);
    expect(focusMinutes(at(0), new Date(at(25).getTime() + 40_000))).toBe(26);
  });

  it('counts a short session as a minute', () => {
    expect(focusMinutes(at(0), new Date(at(0).getTime() + 5_000))).toBe(1);
  });

  it('never goes below a minute, even with the clocks the wrong way round', () => {
    expect(focusMinutes(at(10), at(0))).toBe(1);
  });

  it('caps a timer left running for hours', () => {
    expect(focusMinutes(at(0), at(60 * 30))).toBe(MAX_FOCUS_MINUTES);
  });
});

describe('afterFocus', () => {
  it('takes the time off the estimate', () => {
    expect(afterFocus(60, 25)).toEqual({ minutesLeft: 35, isDone: false });
  });

  it('finishes the task when the estimate runs out', () => {
    expect(afterFocus(30, 30)).toEqual({ minutesLeft: 0, isDone: true });
    expect(afterFocus(30, 45)).toEqual({ minutesLeft: 0, isDone: true });
  });
});
