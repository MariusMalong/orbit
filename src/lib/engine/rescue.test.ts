import { describe, expect, it } from 'vitest';
import { raisingPriorityHelps } from './rescue';
import { generateMultiDaySchedule, type PlanningDay } from './multi-day';
import type { SchedulableTask } from './scheduler';

// Thursday 5 Nov to Saturday 7 Nov 2026, each with a 09:00–17:00 workday,
// in server-local time like the multi-day tests.
const on = (day: number, hhmm: string) =>
  new Date(`2026-11-0${day}T${hhmm}:00`);
const workday = (day: number): PlanningDay => ({
  start: on(day, '09:00'),
  end: on(day, '17:00'),
  urgentUntil: on(day + 1, '00:00'),
});
const dayOff = (day: number): PlanningDay => ({
  start: on(day, '09:00'),
  end: on(day, '09:00'),
  urgentUntil: on(day + 1, '00:00'),
});

const task = (
  id: string,
  durationEstimate: number,
  priority: number,
  deadline: Date | null = null
): SchedulableTask => ({ id, title: id, durationEstimate, priority, deadline });

const lateIds = (tasks: SchedulableTask[], days: PlanningDay[]) =>
  generateMultiDaySchedule(tasks, [], days).lateTaskIds;

describe('raisingPriorityHelps', () => {
  it('is true when high priority gets the task done in time', () => {
    // The report (3 hours, due Friday 10:00) needs Thursday time, but at low
    // priority Thursday goes to the high-priority busywork first.
    const days = [workday(5), workday(6)];
    const tasks = [
      task('busywork', 480, 3),
      task('report', 180, 1, on(6, '10:00')),
    ];
    expect(lateIds(tasks, days)).toEqual(['report']);

    expect(raisingPriorityHelps('report', tasks, [], days)).toBe(true);
  });

  it('is false when there just isn’t enough working time before the deadline', () => {
    // Due Saturday 10:00 with Friday and Saturday off, so only Thursday's
    // 8 working hours come before it, and the grant needs 10.
    const days = [workday(5), dayOff(6), dayOff(7)];
    const tasks = [task('grant', 600, 1, on(7, '10:00'))];
    expect(lateIds(tasks, days)).toEqual(['grant']);

    expect(raisingPriorityHelps('grant', tasks, [], days)).toBe(false);
  });

  it('is false when rescuing one task would make another late', () => {
    // Only one of the two 6-hour tasks fits before Friday's deadlines.
    const days = [workday(5), workday(6)];
    const tasks = [
      task('a', 360, 3, on(6, '10:00')),
      task('b', 360, 1, on(6, '10:00')),
    ];
    expect(lateIds(tasks, days)).toEqual(['b']);

    expect(raisingPriorityHelps('b', tasks, [], days)).toBe(false);
  });

  it('is false for a task that is already high priority, or unknown', () => {
    const days = [workday(5)];
    const tasks = [task('urgent', 600, 3, on(5, '17:00'))];

    expect(raisingPriorityHelps('urgent', tasks, [], days)).toBe(false);
    expect(raisingPriorityHelps('missing', tasks, [], days)).toBe(false);
  });
});
