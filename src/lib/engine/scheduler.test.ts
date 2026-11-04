import { describe, it, expect } from 'vitest';
import {
  calculateFreeWindows,
  generateSchedule,
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

    expect(result).toEqual({ scheduledBlocks: [], bumpedTaskIds: [] });
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
