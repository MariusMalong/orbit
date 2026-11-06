import { describe, it, expect } from 'vitest';
import { generateMultiDaySchedule, PlanningDay } from './multi-day';
import { generateSchedule, SchedulableTask } from './scheduler';

// Fixed dates, server-local, so every test is deterministic: Thursday 5 Nov
// to Saturday 7 Nov 2026, each with a 09:00–17:00 workday.
const on = (day: number, hhmm: string) =>
  new Date(`2026-11-0${day}T${hhmm}:00`);

const workday = (day: number, start = '09:00', end = '17:00'): PlanningDay => ({
  start: on(day, start),
  end: on(day, end),
  urgentUntil: on(day + 1, '00:00'),
});

const threeDays = [workday(5), workday(6), workday(7)];

const task = (
  id: string,
  durationEstimate: number,
  priority = 2,
  deadline: Date | null = null
): SchedulableTask => ({ id, title: id, durationEstimate, priority, deadline });

const blocksFor = (
  result: ReturnType<typeof generateMultiDaySchedule>,
  id: string
) =>
  result.scheduledBlocks
    .filter((b) => b.taskId === id)
    .map(({ dayIndex, startTime, endTime }) => ({
      dayIndex,
      startTime,
      endTime,
    }));

describe('generateMultiDaySchedule', () => {
  it('plans the first day exactly like the single-day engine', () => {
    const tasks = [task('a', 120, 3), task('b', 90, 1), task('c', 60, 2)];
    const commitments = [{ start: on(5, '12:00'), end: on(5, '13:00') }];

    const single = generateSchedule(
      tasks,
      commitments,
      on(5, '09:00'),
      on(5, '17:00'),
      { urgentUntil: on(6, '00:00') }
    );
    const multi = generateMultiDaySchedule(tasks, commitments, threeDays);

    expect(
      multi.scheduledBlocks
        .filter((b) => b.dayIndex === 0)
        .map(({ taskId, startTime, endTime }) => ({
          taskId,
          startTime,
          endTime,
        }))
    ).toEqual(single.scheduledBlocks);
  });

  it("carries a task that doesn't fit today over to tomorrow", () => {
    const result = generateMultiDaySchedule(
      [task('fills-today', 480, 3), task('next', 60, 1)],
      [],
      threeDays
    );

    expect(blocksFor(result, 'next')).toEqual([
      { dayIndex: 1, startTime: on(6, '09:00'), endTime: on(6, '10:00') },
    ]);
    expect(result.unscheduledTaskIds).toEqual([]);
  });

  it('continues a partly planned task the next morning', () => {
    const result = generateMultiDaySchedule([task('long', 600)], [], threeDays);

    expect(blocksFor(result, 'long')).toEqual([
      { dayIndex: 0, startTime: on(5, '09:00'), endTime: on(5, '17:00') },
      { dayIndex: 1, startTime: on(6, '09:00'), endTime: on(6, '11:00') },
    ]);
  });

  it("uses each day's own hours and commitments", () => {
    const days = [workday(5), workday(6, '13:00', '15:00')];
    const result = generateMultiDaySchedule(
      [task('fills-today', 480, 3), task('next', 90, 1)],
      [{ start: on(6, '13:00'), end: on(6, '13:30') }],
      days
    );

    expect(blocksFor(result, 'next')).toEqual([
      { dayIndex: 1, startTime: on(6, '13:30'), endTime: on(6, '15:00') },
    ]);
  });

  it('skips a day with no working time left, such as today after hours', () => {
    const afterHours: PlanningDay = { ...workday(5), start: on(5, '18:00') };
    const result = generateMultiDaySchedule(
      [task('a', 60)],
      [],
      [afterHours, workday(6)]
    );

    expect(blocksFor(result, 'a')).toEqual([
      { dayIndex: 1, startTime: on(6, '09:00'), endTime: on(6, '10:00') },
    ]);
  });

  it('moves a task with a deadline ahead of higher priorities on the day it is due', () => {
    // Due Saturday: planned by priority until then, first on Saturday.
    const result = generateMultiDaySchedule(
      [
        task('high', 480 * 2 + 60, 3),
        task('due-saturday', 60, 1, on(7, '17:00')),
      ],
      [],
      threeDays
    );

    expect(blocksFor(result, 'due-saturday')).toEqual([
      { dayIndex: 2, startTime: on(7, '09:00'), endTime: on(7, '10:00') },
    ]);
    expect(result.lateTaskIds).toEqual([]);
  });

  it('flags a deadline later in the week today, if the task will miss it', () => {
    // Due Saturday 10:00, but there's only an hour of room before then.
    const result = generateMultiDaySchedule(
      [task('high', 480 * 2, 3), task('report', 120, 1, on(7, '10:00'))],
      [],
      threeDays
    );

    expect(blocksFor(result, 'report')).toEqual([
      { dayIndex: 2, startTime: on(7, '09:00'), endTime: on(7, '11:00') },
    ]);
    expect(result.lateTaskIds).toEqual(['report']);
  });

  it('counts a task that does not finish within the days as late if it is due within them', () => {
    const result = generateMultiDaySchedule(
      [task('huge', 480 * 4, 2, on(7, '17:00'))],
      [],
      threeDays
    );

    expect(result.unscheduledTaskIds).toEqual(['huge']);
    expect(result.lateTaskIds).toEqual(['huge']);
  });

  it('does not judge a task that is still open but due after the last day', () => {
    const result = generateMultiDaySchedule(
      [task('huge', 480 * 4, 2, new Date('2026-11-12T17:00:00'))],
      [],
      threeDays
    );

    expect(result.unscheduledTaskIds).toEqual(['huge']);
    expect(result.lateTaskIds).toEqual([]);
  });

  it('keeps carried-over pieces at or above the minimum block length', () => {
    const result = generateMultiDaySchedule(
      [task('a', 470, 3), task('b', 25, 1)],
      [],
      threeDays
    );

    // 'b' can't split 10 + 15 at the end of today, so all 25 minutes move to tomorrow.
    expect(blocksFor(result, 'b')).toEqual([
      { dayIndex: 1, startTime: on(6, '09:00'), endTime: on(6, '09:25') },
    ]);
  });

  it('does not modify the tasks, commitments or days passed in', () => {
    const tasks = [task('a', 600, 2, on(6, '12:00'))];
    const commitments = [{ start: on(6, '10:00'), end: on(6, '11:00') }];
    const days = [workday(5), workday(6)];
    const before = structuredClone({ tasks, commitments, days });

    generateMultiDaySchedule(tasks, commitments, days);

    expect({ tasks, commitments, days }).toEqual(before);
  });
});
