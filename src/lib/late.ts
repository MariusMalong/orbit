import { formatDue } from '@/lib/format';

/**
 * Why a late task is late, as the second half of a sentence that starts
 * with its title: "was due 18:00. It's planned as soon as possible." or
 * "won't be done by Tue 10 Nov, 10:00, even started as early as possible."
 *
 * The planner already starts deadline work as early as it needs to (see
 * src/lib/engine/reservations.ts), so a task that's still late doesn't fit
 * in the time before its deadline at all.
 */
export function lateReason(
  deadline: Date | null | undefined,
  now: Date,
  timeZone: string
): { overdue: boolean; text: string } {
  const due = deadline
    ? formatDue(deadline, now, timeZone).replace(/^Due /, '')
    : 'its deadline';
  const overdue = !!deadline && deadline <= now;
  return overdue
    ? { overdue, text: `was due ${due}. It's planned as soon as possible.` }
    : {
        overdue,
        text: `won't be done by ${due}, even started as early as possible.`,
      };
}
