import { describe, expect, it } from 'vitest';
import { freeMinutes, mustPlanToday } from './reservations';
import type { PlanningDay } from './multi-day';
import type { SchedulableTask } from './scheduler';

const on = (day: number, hhmm: string) =>
  new Date(`2026-11-0${day}T${hhmm}:00`);
const workday = (day: number, end = '17:00'): PlanningDay => ({
  start: on(day, '09:00'),
  end: on(day, end),
  urgentUntil: on(day + 1, '00:00'),
});
const task = (
  id: string,
  durationEstimate: number,
  deadline: Date | null
): SchedulableTask => ({
  id,
  title: id,
  durationEstimate,
  priority: 2,
  deadline,
});

describe('freeMinutes', () => {
  it('counts working time around events, up to a cut-off', () => {
    const lunch = [{ start: on(5, '12:00'), end: on(5, '13:00') }];
    expect(freeMinutes(workday(5), lunch, on(9, '00:00'))).toBe(420);
    expect(freeMinutes(workday(5), lunch, on(5, '14:00'))).toBe(240);
    expect(freeMinutes(workday(5), lunch, on(5, '08:00'))).toBe(0);
  });

  it('is zero on a day off', () => {
    expect(freeMinutes(workday(5, '09:00'), [], on(9, '00:00'))).toBe(0);
  });
});

describe('mustPlanToday', () => {
  const days = [workday(5), workday(6), workday(7)];

  it('leaves a task due after the last day to its priority', () => {
    // 30 hours due on the 9th would need time today if the 7th were the end
    // of the world, but there are working days after it the plan can't see.
    const big = task('big', 1800, on(9, '17:00'));
    const must = mustPlanToday(
      [big],
      new Map([['big', 1800]]),
      days,
      0,
      [],
      15
    );
    expect(must.size).toBe(0);
  });

  it('asks for nothing when later days have room', () => {
    const tasks = [task('report', 300, on(7, '17:00'))];
    const must = mustPlanToday(
      tasks,
      new Map([['report', 300]]),
      days,
      0,
      [],
      15
    );
    expect(must.size).toBe(0);
  });

  it('asks for exactly what the later days cannot hold', () => {
    // Due Saturday 11:00: Friday (480) and Saturday morning (120) hold 600.
    const tasks = [task('report', 700, on(7, '11:00'))];
    const must = mustPlanToday(
      tasks,
      new Map([['report', 700]]),
      days,
      0,
      [],
      15
    );
    expect(must.get('report')).toBe(100);
  });

  it('rounds a small amount up to the minimum block, but not past the task', () => {
    const tasks = [
      task('a', 605, on(7, '11:00')), // 5 minutes short of fitting later
      task('b', 10, on(5, '17:00')), // due today, only 10 minutes long
    ];
    const must = mustPlanToday(
      tasks,
      new Map([
        ['a', 605],
        ['b', 10],
      ]),
      days,
      0,
      [],
      15
    );
    expect(must.get('a')).toBe(15);
    expect(must.get('b')).toBe(10);
  });

  it('ignores tasks without a deadline and tasks already fully planned', () => {
    const tasks = [task('free', 9999, null), task('done', 600, on(5, '17:00'))];
    const must = mustPlanToday(
      tasks,
      new Map([
        ['free', 9999],
        ['done', 0],
      ]),
      days,
      0,
      [],
      15
    );
    expect(must.size).toBe(0);
  });
});
