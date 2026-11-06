import {
  calculateFreeWindows,
  type SchedulableTask,
  type TimeWindow,
} from './scheduler';
import type { PlanningDay } from './multi-day';

// Planning backwards from deadlines.
//
// Each day, before the rest of the day is filled by priority, every task with
// a deadline gets the time it *must* have today: whatever won't fit into the
// free working time left between tomorrow and its deadline. Work is only
// pulled forward when it's really needed, so when there's room later, the
// user's priorities decide as before.
//
// Tasks are taken earliest deadline first, and each one counts the work of
// every task due before it, so two tasks can't both count on the same spare
// hours later in the week. This is the standard feasibility check for
// earliest-deadline-first scheduling, applied one day at a time.

const MS_PER_MINUTE = 60_000;

/** Free working minutes on `day` before `until`, around the commitments. */
export function freeMinutes(
  day: PlanningDay,
  commitments: TimeWindow[],
  until: Date
): number {
  const end = until < day.end ? until : day.end;
  if (end <= day.start) return 0;
  return calculateFreeWindows(day.start, end, commitments).reduce(
    (sum, w) =>
      sum + Math.floor((w.end.getTime() - w.start.getTime()) / MS_PER_MINUTE),
    0
  );
}

/**
 * How many minutes of each deadline task have to be planned on day
 * `dayIndex` so that every deadline can still be met by the later days.
 * Tasks without a deadline, and tasks that can wait, aren't in the result.
 *
 * `remaining` is each task's unplanned minutes at the start of the day.
 * A non-zero amount is rounded up to `minBlockMinutes` (but never above what's
 * left), so a reservation never creates a sliver of a block.
 */
export function mustPlanToday(
  tasks: SchedulableTask[],
  remaining: Map<string, number>,
  days: PlanningDay[],
  dayIndex: number,
  commitments: TimeWindow[],
  minBlockMinutes: number
): Map<string, number> {
  const due = tasks
    .filter((t) => t.deadline && (remaining.get(t.id) ?? 0) > 0)
    .sort((a, b) => a.deadline!.getTime() - b.deadline!.getTime());

  const must = new Map<string, number>();
  let demand = 0; // Unplanned minutes of every task due by this deadline
  let reserved = 0; // Minutes already reserved today for earlier deadlines

  for (const task of due) {
    const left = remaining.get(task.id)!;
    demand += left;

    // Free time on the days after today, up to this task's deadline.
    const later = days
      .slice(dayIndex + 1)
      .reduce(
        (sum, day) => sum + freeMinutes(day, commitments, task.deadline!),
        0
      );

    const needed = Math.max(0, demand - later - reserved);
    if (needed === 0) continue;

    const amount = Math.min(left, Math.max(needed, minBlockMinutes));
    must.set(task.id, amount);
    reserved += amount;
  }

  return must;
}
