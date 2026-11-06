import { describe, it, expect } from 'vitest';
import { buildDemoData, demoWorkdayStart } from './seed';
import { generateSchedule, planningStart } from '../engine/scheduler';
import { generateMultiDaySchedule } from '../engine/multi-day';
import { buildPlanningDays } from '../planning/days';
import { atZonedTime, startOfNextZonedDay } from '../time/zoned';

// A Melbourne visitor on Friday 6 November, while the server (UTC) is still on
// Thursday. The demo must use the visitor's day.
const timeZone = 'Australia/Melbourne';
const friday = new Date('2026-11-06T00:00:00Z'); // 11:00 in Melbourne
const fridayAt = (hhmm: string) => atZonedTime(friday, hhmm, timeZone);

// Run the demo data through the real engine exactly as page.tsx does: the
// demo's own workday, planned from the current time.
function scheduleDemo(now: Date) {
  const data = buildDemoData(now, timeZone);
  const active = data.tasks.filter((t) => t.status !== 'COMPLETED');
  const workDayStart = atZonedTime(now, data.availability.startTime, timeZone);
  const workDayEnd = atZonedTime(now, data.availability.endTime, timeZone);

  const result = generateSchedule(
    active.map((t) => ({
      id: t.title,
      title: t.title,
      durationEstimate: t.durationEstimate,
      priority: t.priority,
      deadline: t.deadline,
    })),
    data.commitments.map((c) => ({ start: c.startTime, end: c.endTime })),
    planningStart(now, workDayStart),
    workDayEnd,
    { urgentUntil: startOfNextZonedDay(now, timeZone) }
  );

  return { ...data, active, workDayStart, workDayEnd, result };
}

// "Now" is always 30–60 minutes into the demo workday; check both ends.
const visits = [
  ['at the start of the half hour', fridayAt('11:00')],
  ['at the end of the half hour', fridayAt('11:29')],
] as const;

describe('demoWorkdayStart', () => {
  it('starts the workday 30–60 minutes before now', () => {
    expect(demoWorkdayStart(fridayAt('11:00'), timeZone)).toBe(10 * 60 + 30);
    expect(demoWorkdayStart(fridayAt('11:29'), timeZone)).toBe(10 * 60 + 30);
    expect(demoWorkdayStart(fridayAt('11:30'), timeZone)).toBe(11 * 60);
  });

  it('never starts before midnight', () => {
    expect(demoWorkdayStart(fridayAt('00:10'), timeZone)).toBe(0);
  });

  it('starts by 15:00 in the evening, so the day still ends today', () => {
    expect(demoWorkdayStart(fridayAt('21:45'), timeZone)).toBe(15 * 60);
  });
});

describe.each(visits)('buildDemoData, visiting %s', (_, now) => {
  it("uses the visitor's day and an 8-hour workday", () => {
    const { availability, workDayStart, workDayEnd } = scheduleDemo(now);

    expect(availability.dayOfWeek).toBe(5); // Friday in Melbourne
    expect(workDayEnd.getTime() - workDayStart.getTime()).toBe(8 * 3_600_000);
    expect(workDayStart < now && now < workDayEnd).toBe(true);
  });

  it('places every commitment inside the workday and after now', () => {
    const { commitments, workDayEnd } = scheduleDemo(now);

    for (const c of commitments) {
      expect(c.startTime > now).toBe(true);
      expect(c.endTime <= workDayEnd).toBe(true);
    }
  });

  it('fits every high- and medium-priority task', () => {
    const { active, result } = scheduleDemo(now);
    const bumped = new Set(result.bumpedTaskIds);

    for (const t of active.filter((t) => t.priority >= 2)) {
      expect(bumped.has(t.title)).toBe(false);
    }
  });

  it('bumps at least one low-priority task, so the warning shows', () => {
    const { active, result } = scheduleDemo(now);
    const lowPriority = active
      .filter((t) => t.priority === 1)
      .map((t) => t.title);

    expect(result.bumpedTaskIds.length).toBeGreaterThan(0);
    for (const id of result.bumpedTaskIds) {
      expect(lowPriority).toContain(id);
    }
  });

  it('plans the task with a deadline first, and finishes it in time', () => {
    const { result } = scheduleDemo(now);

    expect(result.scheduledBlocks[0].taskId).toBe('Reply to supplier emails');
    expect(result.lateTaskIds).toEqual([]);
  });

  it('plans the week so the grant application is flagged late today', () => {
    const data = buildDemoData(now, timeZone);
    const days = buildPlanningDays(now, timeZone, {
      [data.availability.dayOfWeek]: data.availability,
    });
    const open = data.tasks.filter((t) => t.status !== 'COMPLETED');

    const plan = generateMultiDaySchedule(
      open.map((t) => ({ ...t, id: t.title })),
      data.commitments.map((c) => ({ start: c.startTime, end: c.endTime })),
      days
    );

    expect(plan.lateTaskIds).toEqual(['Submit the grant application']);
    expect(plan.unscheduledTaskIds).toEqual([]);
    // Everything that doesn't fit today shows up under "Coming up" tomorrow.
    expect(plan.scheduledBlocks.some((b) => b.dayIndex === 1)).toBe(true);
  });

  it('splits at least one task around a commitment', () => {
    const { result } = scheduleDemo(now);
    const blocksPerTask = new Map<string, number>();
    for (const block of result.scheduledBlocks) {
      blocksPerTask.set(
        block.taskId,
        (blocksPerTask.get(block.taskId) ?? 0) + 1
      );
    }

    expect(Math.max(...blocksPerTask.values())).toBeGreaterThan(1);
  });

  it('logs focus time that ended by now, with matching durations', () => {
    const { tasks } = scheduleDemo(now);

    for (const entry of tasks.flatMap((t) => t.timeEntries)) {
      const minutes =
        (entry.endTime.getTime() - entry.startTime.getTime()) / 60_000;
      expect(entry.duration).toBe(minutes);
      expect(entry.endTime <= now).toBe(true);
    }
  });

  it('includes a task completed today, so the daily summary is not empty', () => {
    const { tasks } = scheduleDemo(now);
    const completed = tasks.filter((t) => t.status === 'COMPLETED');

    expect(completed.length).toBeGreaterThan(0);
    for (const t of completed) {
      expect(t.completedAt).toEqual(now);
    }
  });
});
