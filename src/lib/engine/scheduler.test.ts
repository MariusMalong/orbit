import { describe, it, expect } from 'vitest';
import {
  calculateFreeWindows,
  generateSchedule,
  planningStart,
  SchedulableTask,
  TimeWindow,
} from './scheduler';

// Build a Date on a fixed day so every test is deterministic.
const at = (hhmm: string) => new Date(`2026-11-05T${hhmm}:00`);

// Build a window from two "HH:mm" strings.
const window = (start: string, end: string): TimeWindow => ({
  start: at(start),
  end: at(end),
});

// Build a task with sensible defaults; only the fields a test cares about need setting.
const task = (
  id: string,
  durationEstimate: number,
  priority = 2
): SchedulableTask => ({ id, title: id, durationEstimate, priority });

describe('calculateFreeWindows', () => {
  it('returns the whole workday when there are no commitments', () => {
    const windows = calculateFreeWindows(at('09:00'), at('17:00'), []);

    expect(windows).toEqual([{ start: at('09:00'), end: at('17:00') }]);
  });

  it('splits the day around a commitment in the middle', () => {
    const windows = calculateFreeWindows(at('09:00'), at('17:00'), [
      window('12:00', '13:00'),
    ]);

    expect(windows).toEqual([
      window('09:00', '12:00'),
      window('13:00', '17:00'),
    ]);
  });

  it('gives the same result whatever order commitments are passed in', () => {
    const lunch = window('12:00', '13:00');
    const meeting = window('15:00', '16:00');

    const inOrder = calculateFreeWindows(at('09:00'), at('17:00'), [
      lunch,
      meeting,
    ]);
    const reversed = calculateFreeWindows(at('09:00'), at('17:00'), [
      meeting,
      lunch,
    ]);

    expect(reversed).toEqual(inOrder);
  });

  it('leaves no gap between overlapping commitments', () => {
    const windows = calculateFreeWindows(at('09:00'), at('17:00'), [
      window('10:00', '11:30'),
      window('11:00', '12:00'),
    ]);

    expect(windows).toEqual([
      window('09:00', '10:00'),
      window('12:00', '17:00'),
    ]);
  });

  it('handles a commitment nested inside a longer one', () => {
    const windows = calculateFreeWindows(at('09:00'), at('17:00'), [
      window('10:00', '14:00'),
      window('11:00', '12:00'),
    ]);

    expect(windows).toEqual([
      window('09:00', '10:00'),
      window('14:00', '17:00'),
    ]);
  });

  it('creates no zero-length window when a commitment starts with the workday', () => {
    const windows = calculateFreeWindows(at('09:00'), at('17:00'), [
      window('09:00', '10:00'),
    ]);

    expect(windows).toEqual([window('10:00', '17:00')]);
  });

  it('trims a commitment that starts before the workday', () => {
    const windows = calculateFreeWindows(at('09:00'), at('17:00'), [
      window('08:00', '10:00'),
    ]);

    expect(windows).toEqual([window('10:00', '17:00')]);
  });

  it('trims a commitment that runs past the end of the workday', () => {
    const windows = calculateFreeWindows(at('09:00'), at('17:00'), [
      window('16:00', '18:00'),
    ]);

    expect(windows).toEqual([window('09:00', '16:00')]);
  });

  it('never returns a window that ends after the workday (commitment later that evening)', () => {
    const windows = calculateFreeWindows(at('09:00'), at('17:00'), [
      window('18:00', '19:00'),
    ]);

    expect(windows).toEqual([window('09:00', '17:00')]);
  });

  it("ignores a commitment on another day (the dashboard passes every commitment, including tomorrow's)", () => {
    const tomorrowMorning = {
      start: new Date('2026-11-06T10:00:00'),
      end: new Date('2026-11-06T11:00:00'),
    };

    const windows = calculateFreeWindows(at('09:00'), at('17:00'), [
      tomorrowMorning,
    ]);

    expect(windows).toEqual([window('09:00', '17:00')]);
  });

  it('returns no windows when commitments cover the whole day', () => {
    const windows = calculateFreeWindows(at('09:00'), at('17:00'), [
      window('08:00', '18:00'),
    ]);

    expect(windows).toEqual([]);
  });
});

describe('generateSchedule', () => {
  it('schedules a single task at the start of an empty day', () => {
    const result = generateSchedule(
      [task('a', 60)],
      [],
      at('09:00'),
      at('17:00')
    );

    expect(result.scheduledBlocks).toEqual([
      { taskId: 'a', startTime: at('09:00'), endTime: at('10:00') },
    ]);
    expect(result.bumpedTaskIds).toEqual([]);
  });

  it('schedules tasks back to back without overlapping', () => {
    const result = generateSchedule(
      [task('a', 30), task('b', 45)],
      [],
      at('09:00'),
      at('17:00')
    );

    expect(result.scheduledBlocks).toEqual([
      { taskId: 'a', startTime: at('09:00'), endTime: at('09:30') },
      { taskId: 'b', startTime: at('09:30'), endTime: at('10:15') },
    ]);
  });

  it('schedules higher-priority tasks first, regardless of input order', () => {
    const result = generateSchedule(
      [task('low', 60, 1), task('high', 60, 3), task('medium', 60, 2)],
      [],
      at('09:00'),
      at('17:00')
    );

    expect(result.scheduledBlocks.map((b) => b.taskId)).toEqual([
      'high',
      'medium',
      'low',
    ]);
  });

  it('keeps the input order for tasks with equal priority', () => {
    const result = generateSchedule(
      [task('first', 30, 2), task('second', 30, 2)],
      [],
      at('09:00'),
      at('17:00')
    );

    expect(result.scheduledBlocks.map((b) => b.taskId)).toEqual([
      'first',
      'second',
    ]);
  });

  it('splits a task around a commitment', () => {
    const result = generateSchedule(
      [task('a', 180)],
      [window('10:00', '11:00')],
      at('09:00'),
      at('17:00')
    );

    expect(result.scheduledBlocks).toEqual([
      { taskId: 'a', startTime: at('09:00'), endTime: at('10:00') },
      { taskId: 'a', startTime: at('11:00'), endTime: at('13:00') },
    ]);
    expect(result.bumpedTaskIds).toEqual([]);
  });

  it('uses the gap left after one task for the next task', () => {
    // 'a' leaves 30 minutes before the 10:00 commitment; 'b' should use it.
    const result = generateSchedule(
      [task('a', 30, 3), task('b', 60, 2)],
      [window('10:00', '11:00')],
      at('09:00'),
      at('17:00')
    );

    expect(result.scheduledBlocks).toEqual([
      { taskId: 'a', startTime: at('09:00'), endTime: at('09:30') },
      { taskId: 'b', startTime: at('09:30'), endTime: at('10:00') },
      { taskId: 'b', startTime: at('11:00'), endTime: at('11:30') },
    ]);
  });

  it('schedules what fits and bumps a task that runs past the end of the day', () => {
    const result = generateSchedule(
      [task('long', 90)],
      [],
      at('09:00'),
      at('10:00')
    );

    expect(result.scheduledBlocks).toEqual([
      { taskId: 'long', startTime: at('09:00'), endTime: at('10:00') },
    ]);
    expect(result.bumpedTaskIds).toEqual(['long']);
  });

  it('bumps a task entirely when earlier tasks fill the day', () => {
    const result = generateSchedule(
      [task('fills-day', 60, 3), task('no-room', 30, 1)],
      [],
      at('09:00'),
      at('10:00')
    );

    expect(result.scheduledBlocks.map((b) => b.taskId)).toEqual(['fills-day']);
    expect(result.bumpedTaskIds).toEqual(['no-room']);
  });

  it('never schedules a block past the end of the workday', () => {
    // Same bug as the calculateFreeWindows evening test, seen from the schedule's side.
    const result = generateSchedule(
      [task('a', 600)],
      [window('18:00', '19:00')],
      at('09:00'),
      at('17:00')
    );

    for (const block of result.scheduledBlocks) {
      expect(block.endTime.getTime()).toBeLessThanOrEqual(
        at('17:00').getTime()
      );
    }
    expect(result.bumpedTaskIds).toEqual(['a']);
  });

  it('returns an empty schedule when there are no tasks', () => {
    const result = generateSchedule([], [], at('09:00'), at('17:00'));

    expect(result).toEqual({
      scheduledBlocks: [],
      bumpedTaskIds: [],
      lateTaskIds: [],
    });
  });

  it('does not modify the tasks or commitments passed in', () => {
    const tasks = [task('a', 120, 1), task('b', 60, 3)];
    const commitments = [window('10:00', '11:00')];
    const tasksBefore = structuredClone(tasks);
    const commitmentsBefore = structuredClone(commitments);

    generateSchedule(tasks, commitments, at('09:00'), at('17:00'));

    expect(tasks).toEqual(tasksBefore);
    expect(commitments).toEqual(commitmentsBefore);
  });
});

describe('planningStart', () => {
  it('starts at the beginning of the workday if it has not started yet', () => {
    expect(planningStart(at('07:42'), at('09:00'))).toEqual(at('09:00'));
  });

  it('starts from now, rounded up to the next 5 minutes, during the day', () => {
    expect(planningStart(at('10:02'), at('09:00'))).toEqual(at('10:05'));
  });

  it('keeps a time that is already on a 5-minute mark', () => {
    expect(planningStart(at('10:05'), at('09:00'))).toEqual(at('10:05'));
  });

  it('rounds up past a 5-minute mark by even a few seconds', () => {
    const justAfter = new Date(at('10:05').getTime() + 30_000);

    expect(planningStart(justAfter, at('09:00'))).toEqual(at('10:10'));
  });

  it('bumps everything once the workday is over', () => {
    const start = planningStart(at('17:30'), at('09:00'));

    const result = generateSchedule([task('a', 30)], [], start, at('17:00'));

    expect(result.scheduledBlocks).toEqual([]);
    expect(result.bumpedTaskIds).toEqual(['a']);
  });

  it('plans only the time left in the day', () => {
    const start = planningStart(at('16:00'), at('09:00'));

    const result = generateSchedule([task('a', 90)], [], start, at('17:00'));

    expect(result.scheduledBlocks).toEqual([
      { taskId: 'a', startTime: at('16:00'), endTime: at('17:00') },
    ]);
    expect(result.bumpedTaskIds).toEqual(['a']);
  });
});

// A task with a deadline ("HH:mm" today, or a full Date).
const due = (
  base: SchedulableTask,
  deadline: string | Date
): SchedulableTask => ({
  ...base,
  deadline: typeof deadline === 'string' ? at(deadline) : deadline,
});

const order = (blocks: { taskId: string }[]) => [
  ...new Set(blocks.map((b) => b.taskId)),
];

describe('deadlines', () => {
  it('plans a task due today ahead of higher-priority tasks', () => {
    const result = generateSchedule(
      [task('report', 60, 3), due(task('invoice', 30, 1), '11:00')],
      [],
      at('09:00'),
      at('17:00')
    );

    expect(result.scheduledBlocks[0]).toEqual({
      taskId: 'invoice',
      startTime: at('09:00'),
      endTime: at('09:30'),
    });
    expect(result.lateTaskIds).toEqual([]);
  });

  it('plans urgent tasks earliest deadline first', () => {
    const result = generateSchedule(
      [due(task('noon', 30), '12:00'), due(task('ten', 30), '10:00')],
      [],
      at('09:00'),
      at('17:00')
    );

    expect(order(result.scheduledBlocks)).toEqual(['ten', 'noon']);
  });

  it('breaks a tie between equal deadlines by priority', () => {
    const result = generateSchedule(
      [due(task('low', 30, 1), '12:00'), due(task('high', 30, 3), '12:00')],
      [],
      at('09:00'),
      at('17:00')
    );

    expect(order(result.scheduledBlocks)).toEqual(['high', 'low']);
  });

  it('keeps priority order for later deadlines, using them only as a tie-break', () => {
    const tomorrow = new Date('2026-11-06T12:00:00');
    const nextWeek = new Date('2026-11-12T12:00:00');

    const result = generateSchedule(
      [
        task('medium-no-deadline', 30, 2),
        due(task('medium-next-week', 30, 2), nextWeek),
        due(task('medium-tomorrow', 30, 2), tomorrow),
        task('high-no-deadline', 30, 3),
      ],
      [],
      at('09:00'),
      at('17:00')
    );

    expect(order(result.scheduledBlocks)).toEqual([
      'high-no-deadline',
      'medium-tomorrow',
      'medium-next-week',
      'medium-no-deadline',
    ]);
  });

  it('treats an overdue task as the most urgent, and reports it late', () => {
    const result = generateSchedule(
      [due(task('due-ten', 30), '10:00'), due(task('overdue', 30), '08:00')],
      [],
      at('09:00'),
      at('17:00')
    );

    expect(order(result.scheduledBlocks)).toEqual(['overdue', 'due-ten']);
    expect(result.lateTaskIds).toEqual(['overdue']);
  });

  it('reports a task that finishes after its deadline as late', () => {
    const result = generateSchedule(
      [due(task('big', 120), '10:00')],
      [],
      at('09:00'),
      at('17:00')
    );

    expect(result.bumpedTaskIds).toEqual([]);
    expect(result.lateTaskIds).toEqual(['big']);
  });

  it('counts finishing exactly at the deadline as on time', () => {
    const result = generateSchedule(
      [due(task('exact', 60), '10:00')],
      [],
      at('09:00'),
      at('17:00')
    );

    expect(result.lateTaskIds).toEqual([]);
  });

  it('reports a task due today that does not fit as late', () => {
    const result = generateSchedule(
      [due(task('first', 60), '10:00'), due(task('second', 30), '10:00')],
      [],
      at('09:00'),
      at('10:00')
    );

    expect(result.bumpedTaskIds).toEqual(['second']);
    expect(result.lateTaskIds).toEqual(['second']);
  });

  it('does not report a bumped task as late when it is due after today', () => {
    const result = generateSchedule(
      [due(task('later', 120), new Date('2026-11-09T12:00:00'))],
      [],
      at('09:00'),
      at('10:00')
    );

    expect(result.bumpedTaskIds).toEqual(['later']);
    expect(result.lateTaskIds).toEqual([]);
  });

  it('uses urgentUntil to decide what counts as due today', () => {
    // Due tonight, after the workday ends: urgent only if "today" runs to midnight.
    const tasks = [task('high', 60, 3), due(task('tonight', 30, 1), '20:00')];
    const midnight = new Date('2026-11-06T00:00:00');

    const withoutOption = generateSchedule(tasks, [], at('09:00'), at('17:00'));
    const withOption = generateSchedule(tasks, [], at('09:00'), at('17:00'), {
      urgentUntil: midnight,
    });

    expect(order(withoutOption.scheduledBlocks)).toEqual(['high', 'tonight']);
    expect(order(withOption.scheduledBlocks)).toEqual(['tonight', 'high']);
  });
});

describe('minimum block length', () => {
  it('leaves a gap empty rather than squeezing in a sliver', () => {
    const result = generateSchedule(
      [task('a', 60)],
      [window('09:10', '10:00')],
      at('09:00'),
      at('17:00')
    );

    expect(result.scheduledBlocks).toEqual([
      { taskId: 'a', startTime: at('10:00'), endTime: at('11:00') },
    ]);
  });

  it('still fits a whole task shorter than the minimum into a small gap', () => {
    const result = generateSchedule(
      [task('quick', 10)],
      [window('09:10', '10:00')],
      at('09:00'),
      at('17:00')
    );

    expect(result.scheduledBlocks).toEqual([
      { taskId: 'quick', startTime: at('09:00'), endTime: at('09:10') },
    ]);
  });

  it('shortens a split so the piece left over is not a sliver', () => {
    // 50 minutes into a 45-minute gap would leave 5 minutes; use 35 + 15 instead.
    const result = generateSchedule(
      [task('a', 50)],
      [window('09:45', '10:00')],
      at('09:00'),
      at('17:00')
    );

    expect(result.scheduledBlocks).toEqual([
      { taskId: 'a', startTime: at('09:00'), endTime: at('09:35') },
      { taskId: 'a', startTime: at('10:00'), endTime: at('10:15') },
    ]);
  });

  it('skips a gap when any split would leave a piece too short', () => {
    // 25 minutes can't be split into two pieces of at least 15.
    const result = generateSchedule(
      [task('a', 25)],
      [window('09:20', '10:00')],
      at('09:00'),
      at('17:00')
    );

    expect(result.scheduledBlocks).toEqual([
      { taskId: 'a', startTime: at('10:00'), endTime: at('10:25') },
    ]);
  });

  it('accepts a custom minimum', () => {
    const result = generateSchedule(
      [task('a', 60)],
      [window('09:10', '10:00')],
      at('09:00'),
      at('17:00'),
      { minBlockMinutes: 5 }
    );

    expect(result.scheduledBlocks).toEqual([
      { taskId: 'a', startTime: at('09:00'), endTime: at('09:10') },
      { taskId: 'a', startTime: at('10:00'), endTime: at('10:50') },
    ]);
  });

  it('never creates a block under the minimum, except a whole short task', () => {
    // Every combination of gap position, gap length and task length.
    for (let gapStart = 0; gapStart <= 60; gapStart += 5) {
      for (let gapLength = 5; gapLength <= 60; gapLength += 5) {
        for (const minutes of [5, 10, 20, 25, 30, 45, 50, 90, 200]) {
          const commitmentStart = new Date(
            at('09:00').getTime() + gapStart * 60_000
          );
          const commitmentEnd = new Date(
            commitmentStart.getTime() + gapLength * 60_000
          );

          const result = generateSchedule(
            [task('a', minutes), task('b', 30)],
            [{ start: commitmentStart, end: commitmentEnd }],
            at('09:00'),
            at('12:00')
          );

          for (const block of result.scheduledBlocks) {
            const length =
              (block.endTime.getTime() - block.startTime.getTime()) / 60_000;
            const whole = block.taskId === 'a' ? minutes : 30;
            if (length < 15) expect(length).toBe(whole);
          }
        }
      }
    }
  });
});
