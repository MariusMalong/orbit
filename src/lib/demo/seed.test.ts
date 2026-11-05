import { describe, it, expect } from 'vitest';
import { buildDemoData } from './seed';
import { generateSchedule } from '../engine/scheduler';
import { atZonedTime } from '../time/zoned';

// A Melbourne visitor at 11:00 on Friday 6 November, while the server (UTC)
// is still on Thursday. The demo must use the visitor's day.
const timeZone = 'Australia/Melbourne';
const now = new Date('2026-11-06T00:00:00Z');
const at = (hhmm: string) => atZonedTime(now, hhmm, timeZone);

// Run the demo data through the real engine with the dashboard's default
// 09:00–17:00 workday, the same way page.tsx does.
function scheduleDemo() {
  const { tasks, commitments } = buildDemoData(now, timeZone);
  const active = tasks.filter((t) => t.status !== 'COMPLETED');

  const result = generateSchedule(
    active.map((t) => ({
      id: t.title,
      title: t.title,
      durationEstimate: t.durationEstimate,
      priority: t.priority,
    })),
    commitments.map((c) => ({ start: c.startTime, end: c.endTime })),
    at('09:00'),
    at('17:00')
  );

  return { tasks, commitments, result };
}

describe('buildDemoData', () => {
  it('places every commitment inside the default workday, on the same day', () => {
    const { commitments } = buildDemoData(now, timeZone);

    for (const c of commitments) {
      expect(c.startTime.getTime()).toBeGreaterThanOrEqual(
        at('09:00').getTime()
      );
      expect(c.endTime.getTime()).toBeLessThanOrEqual(at('17:00').getTime());
      expect(c.startTime < c.endTime).toBe(true);
    }
  });

  it('bumps exactly one task, the lowest-priority one, so the warning shows', () => {
    const { result } = scheduleDemo();

    expect(result.bumpedTaskIds).toEqual(['Read the onboarding guide']);
  });

  it('splits at least one task around a commitment', () => {
    const { result } = scheduleDemo();
    const blocksPerTask = new Map<string, number>();
    for (const block of result.scheduledBlocks) {
      blocksPerTask.set(
        block.taskId,
        (blocksPerTask.get(block.taskId) ?? 0) + 1
      );
    }

    expect(Math.max(...blocksPerTask.values())).toBeGreaterThan(1);
  });

  it('gives logged time entries a duration that matches their start and end', () => {
    const { tasks } = buildDemoData(now, timeZone);

    for (const entry of tasks.flatMap((t) => t.timeEntries)) {
      const minutes =
        (entry.endTime.getTime() - entry.startTime.getTime()) / 60_000;
      expect(entry.duration).toBe(minutes);
    }
  });

  it('includes a completed task so the daily summary is not empty', () => {
    const { tasks } = buildDemoData(now, timeZone);

    expect(tasks.some((t) => t.status === 'COMPLETED')).toBe(true);
  });
});
