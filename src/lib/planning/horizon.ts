import type { MultiDayResult } from '@/lib/engine/multi-day';
import type { DeadlineChanges } from '@/lib/engine/changes';
import type { SchedulableTask } from '@/lib/engine/scheduler';

// The pages show 7 days, but the plan looks further ahead when a deadline is
// further out: a 20-hour task due in three weeks needs time before then, and
// only planning the days up to its deadline shows how much has to happen
// this week. The plan is made over the longer horizon and then cut back to
// the days on screen.

export const SHOWN_DAYS = 7;
/** Deadlines further out than this are planned by priority until they come closer. */
export const MAX_PLANNING_DAYS = 56;

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * How many days to plan: enough to reach the latest deadline (from
 * `startOfToday`), at least the days shown and at most MAX_PLANNING_DAYS.
 */
export function planningDayCount(
  tasks: SchedulableTask[],
  startOfToday: Date
): number {
  const latest = Math.max(0, ...tasks.map((t) => t.deadline?.getTime() ?? 0));
  // Whole days to the deadline, +1 so its own day is included. The extra
  // hour covers a day shortened by daylight saving.
  const needed =
    Math.floor((latest - startOfToday.getTime() + MS_PER_HOUR) / MS_PER_DAY) +
    1;
  return Math.min(MAX_PLANNING_DAYS, Math.max(SHOWN_DAYS, needed));
}

/**
 * The plan for the first `dayCount` days only. Tasks that carry on past them
 * are reported as unscheduled only if they have no deadline after those
 * days: one that's due later is on track, not short of time.
 */
export function planForShownDays(
  plan: MultiDayResult,
  tasks: SchedulableTask[],
  shownUntil: Date, // End of the last shown day
  dayCount = SHOWN_DAYS
): MultiDayResult {
  const scheduledBlocks = plan.scheduledBlocks.filter(
    (b) => b.dayIndex < dayCount
  );
  const plannedMinutes = new Map<string, number>();
  for (const b of scheduledBlocks) {
    plannedMinutes.set(
      b.taskId,
      (plannedMinutes.get(b.taskId) ?? 0) +
        Math.round((b.endTime.getTime() - b.startTime.getTime()) / 60_000)
    );
  }
  const unscheduledTaskIds = tasks
    .filter(
      (t) =>
        (plannedMinutes.get(t.id) ?? 0) < t.durationEstimate &&
        !(t.deadline && t.deadline > shownUntil)
    )
    .map((t) => t.id);

  return {
    scheduledBlocks,
    unscheduledTaskIds,
    lateTaskIds: plan.lateTaskIds,
    startedEarlyTaskIds: plan.startedEarlyTaskIds.filter((id) =>
      scheduledBlocks.some((b) => b.taskId === id)
    ),
  };
}

/**
 * The deadline changes that touch the shown days. A task pushed past them
 * gets `toDayIndex: null`, which the page words as "after this week".
 */
export function changesForShownDays(
  changes: DeadlineChanges,
  dayCount = SHOWN_DAYS
): DeadlineChanges {
  return {
    startedEarly: changes.startedEarly.filter(
      (c) => c.firstDayIndex < dayCount
    ),
    movedLater: changes.movedLater
      .filter((c) => c.fromDayIndex < dayCount)
      .map((c) => ({
        ...c,
        toDayIndex:
          c.toDayIndex !== null && c.toDayIndex < dayCount
            ? c.toDayIndex
            : null,
      })),
  };
}
