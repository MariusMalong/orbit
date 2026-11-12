// Rules for the focus timer that don't need the database, so they can be
// tested on their own. A running timer is a TimeEntry with no endTime.

/**
 * The longest one focus session counts for. A timer left running overnight
 * would otherwise log the whole night and finish the task.
 */
export const MAX_FOCUS_MINUTES = 8 * 60;

/** Whole minutes worked between start and end: at least one, at most the cap. */
export function focusMinutes(start: Date, end: Date): number {
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  return Math.min(MAX_FOCUS_MINUTES, Math.max(1, minutes));
}

/**
 * What logging `minutes` does to a task with `estimate` minutes left: the
 * time comes off the estimate, and at zero the task is done.
 */
export function afterFocus(estimate: number, minutes: number) {
  const minutesLeft = Math.max(0, estimate - minutes);
  return { minutesLeft, isDone: minutesLeft === 0 };
}
