import { describe, expect, it } from 'vitest';
import { deadlineChanges } from './changes';
import { generateMultiDaySchedule, type PlanningDay } from './multi-day';
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
  priority: number,
  deadline: Date | null = null
): SchedulableTask => ({ id, title: id, durationEstimate, priority, deadline });

const compare = (tasks: SchedulableTask[], days: PlanningDay[]) =>
  deadlineChanges(
    generateMultiDaySchedule(tasks, [], days),
    generateMultiDaySchedule(tasks, [], days, { planForDeadlines: false })
  );

describe('deadlineChanges', () => {
  it('reports nothing when deadlines fit without changing anything', () => {
    expect(
      compare(
        [task('high', 240, 3), task('report', 120, 1, on(7, '17:00'))],
        [workday(5), workday(6), workday(7)]
      )
    ).toEqual({ startedEarly: [], movedLater: [] });
  });

  it('reports the task started early and the work it pushed to a later day', () => {
    // The report (due Saturday 10:00) needs an hour on Friday, so an hour of
    // the high-priority work moves from Friday to Saturday.
    const changes = compare(
      [task('high', 480 * 2, 3), task('report', 120, 1, on(7, '10:00'))],
      [workday(5), workday(6), workday(7)]
    );

    expect(changes.startedEarly).toEqual([
      { taskId: 'report', firstDayIndex: 1 },
    ]);
    expect(changes.movedLater).toEqual([
      { taskId: 'high', fromDayIndex: 1, toDayIndex: 2 },
    ]);
  });

  it('reports work that no longer fits within the planned days', () => {
    // Saturday has one hour, and the report (due Saturday 10:00) needs it,
    // so the last hour of the high-priority work no longer fits this week.
    // By priority alone, the high work would finish on Friday and the report
    // would be late.
    const changes = compare(
      [task('high', 480 * 2, 3), task('report', 120, 1, on(7, '10:00'))],
      [workday(5), workday(6), workday(7, '10:00')]
    );

    expect(changes.movedLater).toEqual([
      { taskId: 'high', fromDayIndex: 1, toDayIndex: null },
    ]);
  });
});
