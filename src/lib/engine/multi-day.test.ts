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

const minutes = (b: { startTime: Date; endTime: Date }) =>
  (b.endTime.getTime() - b.startTime.getTime()) / 60000;

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

  it('starts a task early when the days before its deadline would be too full', () => {
    // Due Saturday 10:00. Saturday only has an hour before then, so the other
    // hour has to come on Friday, ahead of the higher-priority work.
    const result = generateMultiDaySchedule(
      [task('high', 480 * 2, 3), task('report', 120, 1, on(7, '10:00'))],
      [],
      threeDays
    );

    expect(blocksFor(result, 'report')).toEqual([
      { dayIndex: 1, startTime: on(6, '09:00'), endTime: on(6, '10:00') },
      { dayIndex: 2, startTime: on(7, '09:00'), endTime: on(7, '10:00') },
    ]);
    expect(result.lateTaskIds).toEqual([]);
    expect(result.startedEarlyTaskIds).toEqual(['report']);
    // Thursday is untouched: the report only takes what it needs, when it
    // needs it.
    expect(blocksFor(result, 'high')[0]).toEqual({
      dayIndex: 0,
      startTime: on(5, '09:00'),
      endTime: on(5, '17:00'),
    });
  });

  it('plans by priority as before when there is room before the deadline', () => {
    const tasks = [
      task('high', 240, 3),
      task('report', 120, 1, on(7, '17:00')),
    ];
    const result = generateMultiDaySchedule(tasks, [], threeDays);
    const priorityOnly = generateMultiDaySchedule(tasks, [], threeDays, {
      planForDeadlines: false,
    });

    expect(result.scheduledBlocks).toEqual(priorityOnly.scheduledBlocks);
    expect(result.startedEarlyTaskIds).toEqual([]);
  });

  it('counts deadlines together, so two tasks cannot rely on the same spare time', () => {
    // Both due Saturday 11:00, 6 hours each. Friday and Saturday morning
    // have 10 hours: enough for either task alone, so checked one at a time
    // neither would start on Thursday, and one would end up late. Together
    // they need 12 hours, so 2 of them have to come on Thursday.
    const days = [workday(5), workday(6), workday(7, '09:00', '11:00')];
    const tasks = [
      task('filler', 480 * 3, 3),
      task('essay', 360, 1, on(7, '11:00')),
      task('slides', 360, 1, on(7, '11:00')),
    ];
    const result = generateMultiDaySchedule(tasks, [], days);

    const thursday = result.scheduledBlocks.filter(
      (b) => b.dayIndex === 0 && b.taskId !== 'filler'
    );
    expect(thursday.reduce((sum, b) => sum + minutes(b), 0)).toBe(120);
    expect(result.lateTaskIds).toEqual([]);
    expect(result.startedEarlyTaskIds).toEqual(['essay', 'slides']);
  });

  it('still flags a deadline that no amount of planning can meet', () => {
    // Due Saturday 10:00 with 20 hours of work and 17 hours of room.
    const result = generateMultiDaySchedule(
      [task('report', 1200, 1, on(7, '10:00'))],
      [],
      threeDays
    );

    expect(result.lateTaskIds).toEqual(['report']);
  });

  it('can be switched off, planning each day by priority alone', () => {
    const result = generateMultiDaySchedule(
      [task('high', 480 * 2, 3), task('report', 120, 1, on(7, '10:00'))],
      [],
      threeDays,
      { planForDeadlines: false }
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

describe('generateMultiDaySchedule, on randomly generated weeks', () => {
  // A small seeded random generator, so a failure can be reproduced.
  function random(seed: number) {
    return () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed / 2 ** 31;
    };
  }

  it('never double-books, leaves working hours, covers events or over-plans', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rand = random(seed);
      const pick = (n: number) => Math.floor(rand() * n);

      // Five days with varied hours, some of them days off.
      const days: PlanningDay[] = [5, 6, 7, 8, 9].map((d) => {
        const date = (hhmm: string) => new Date(`2026-11-0${d}T${hhmm}:00`);
        const start = 7 + pick(4);
        const end = start + 3 + pick(8);
        const off = rand() < 0.2;
        return {
          start: date(`${String(start).padStart(2, '0')}:00`),
          end: date(`${String(off ? start : end).padStart(2, '0')}:00`),
          urgentUntil: new Date(
            `2026-11-${String(d + 1).padStart(2, '0')}T00:00:00`
          ),
        };
      });
      const commitments = Array.from({ length: pick(6) }, () => {
        const day = 5 + pick(5);
        const hour = 8 + pick(9);
        const start = new Date(
          `2026-11-0${day}T${String(hour).padStart(2, '0')}:00:00`
        );
        const length = (30 + pick(2) * 30) * 60_000; // 30 or 60 minutes
        return { start, end: new Date(start.getTime() + length) };
      });
      const tasks = Array.from({ length: 1 + pick(8) }, (_, i) =>
        task(
          `t${i}`,
          5 * (1 + pick(60)),
          1 + pick(3),
          rand() < 0.5
            ? new Date(
                `2026-11-0${5 + pick(5)}T${String(9 + pick(9)).padStart(2, '0')}:00:00`
              )
            : null
        )
      );

      const { scheduledBlocks } = generateMultiDaySchedule(
        tasks,
        commitments,
        days
      );
      const context = `seed ${seed}`;

      const sorted = [...scheduledBlocks].sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      );
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].startTime >= sorted[i - 1].endTime, context).toBe(
          true
        );
      }
      for (const block of scheduledBlocks) {
        const day = days[block.dayIndex];
        expect(block.startTime >= day.start, context).toBe(true);
        expect(block.endTime <= day.end, context).toBe(true);
        for (const c of commitments) {
          const overlaps = block.startTime < c.end && c.start < block.endTime;
          expect(overlaps, context).toBe(false);
        }
      }
      for (const t of tasks) {
        const planned = scheduledBlocks
          .filter((b) => b.taskId === t.id)
          .reduce((sum, b) => sum + minutes(b), 0);
        expect(planned <= t.durationEstimate, context).toBe(true);
      }
    }
  });
});
