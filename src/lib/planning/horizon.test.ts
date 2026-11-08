import { describe, expect, it } from 'vitest';
import {
  changesForShownDays,
  MAX_PLANNING_DAYS,
  planForShownDays,
  planningDayCount,
} from './horizon';
import {
  generateMultiDaySchedule,
  type PlanningDay,
} from '@/lib/engine/multi-day';
import type { SchedulableTask } from '@/lib/engine/scheduler';

const day = (n: number, hhmm = '00:00') =>
  new Date(Date.UTC(2026, 10, n, ...hhmm.split(':').map(Number)));
// Nov 2026, every day 09:00-17:00 UTC, from the 2nd.
const workdays = (count: number): PlanningDay[] =>
  Array.from({ length: count }, (_, i) => ({
    start: day(2 + i, '09:00'),
    end: day(2 + i, '17:00'),
    urgentUntil: day(3 + i),
  }));
const task = (
  id: string,
  durationEstimate: number,
  deadline: Date | null = null,
  priority = 2
): SchedulableTask => ({ id, title: id, durationEstimate, priority, deadline });

describe('planningDayCount', () => {
  const today = day(2);

  it('plans the shown week when nothing is due later', () => {
    expect(planningDayCount([task('a', 60)], today)).toBe(7);
    expect(planningDayCount([task('a', 60, day(4, '12:00'))], today)).toBe(7);
  });

  it('reaches the day of the latest deadline', () => {
    // Due on the 20th: the 2nd to the 20th is 19 days.
    expect(planningDayCount([task('a', 60, day(20, '12:00'))], today)).toBe(19);
  });

  it(`stops at ${MAX_PLANNING_DAYS} days`, () => {
    expect(
      planningDayCount([task('a', 60, day(2 + 200, '12:00'))], today)
    ).toBe(MAX_PLANNING_DAYS);
  });
});

describe('planning past the shown week', () => {
  // 110 hours due on the 18th: 17 days of 8 hours, so from the 5th on
  // there are fewer than 110 hours left before it. The high-priority client
  // work would take all of this week, so the thesis has to claim its share
  // of it to make the deadline.
  const tasks = [
    task('thesis', 110 * 60, day(18, '17:00'), 1),
    task('client', 9 * 8 * 60, null, 3),
  ];

  it('starts long-range work this week when the later days are too full', () => {
    const days = workdays(planningDayCount(tasks, day(2)));
    const full = generateMultiDaySchedule(tasks, [], days);
    const week = planForShownDays(full, tasks, day(9));

    expect(full.lateTaskIds).toEqual([]);
    expect(week.startedEarlyTaskIds).toEqual(['thesis']);
    expect(week.scheduledBlocks.every((b) => b.dayIndex < 7)).toBe(true);
    const thesisThisWeek = week.scheduledBlocks
      .filter((b) => b.taskId === 'thesis')
      .reduce(
        (sum, b) => sum + (b.endTime.getTime() - b.startTime.getTime()),
        0
      );
    expect(thesisThisWeek).toBeGreaterThan(0);

    // On track, so it isn't reported as short of time this week, while the
    // client work (no deadline) that runs past the week is.
    expect(week.unscheduledTaskIds).toEqual(['client']);
  });

  it('would have missed the deadline planning only the shown week', () => {
    // Planned 7 days at a time, nothing of the thesis is reserved this week
    // (its deadline is past the last day), so the client work fills it.
    const week = generateMultiDaySchedule(tasks, [], workdays(7));
    expect(week.scheduledBlocks.some((b) => b.taskId === 'thesis')).toBe(false);
  });
});

describe('changesForShownDays', () => {
  it('drops changes outside the week and words later moves as after it', () => {
    expect(
      changesForShownDays({
        startedEarly: [
          { taskId: 'a', firstDayIndex: 2 },
          { taskId: 'b', firstDayIndex: 9 },
        ],
        movedLater: [
          { taskId: 'c', fromDayIndex: 3, toDayIndex: 5 },
          { taskId: 'd', fromDayIndex: 6, toDayIndex: 8 },
          { taskId: 'e', fromDayIndex: 8, toDayIndex: 10 },
        ],
      })
    ).toEqual({
      startedEarly: [{ taskId: 'a', firstDayIndex: 2 }],
      movedLater: [
        { taskId: 'c', fromDayIndex: 3, toDayIndex: 5 },
        { taskId: 'd', fromDayIndex: 6, toDayIndex: null },
      ],
    });
  });
});
