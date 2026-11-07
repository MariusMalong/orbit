import { formatClock } from '@/lib/format';
import { atZonedTime } from '@/lib/time/zoned';

// Where a task dragged on the Today timeline or the Week board should start.
// Pure, so the rules can be tested without a browser.

const MS_PER_MINUTE = 60_000;
/** Dragged tasks snap to quarter hours. */
export const SNAP_MINUTES = 15;

/**
 * The new start of a block dragged `minutes` up or down the timeline, snapped
 * to the quarter hour and kept between `earliest` (planning can't start in
 * the past) and the last quarter hour before `latest`.
 */
export function movedStart(
  start: Date,
  minutes: number,
  earliest: Date,
  latest: Date
): Date {
  const snapMs = SNAP_MINUTES * MS_PER_MINUTE;
  const moved = start.getTime() + minutes * MS_PER_MINUTE;
  const snapped = Math.round(moved / snapMs) * snapMs;
  const min = Math.ceil(earliest.getTime() / snapMs) * snapMs;
  const max = latest.getTime() - snapMs;
  return new Date(Math.max(min, Math.min(snapped, max)));
}

/**
 * The start for a block moved to another day on the Week board: the same
 * time of day if it's within that day's planning time, otherwise the start
 * of it (the start of the workday, or now for today).
 */
export function startOnDay(
  start: Date,
  day: { date: Date; start: Date; end: Date },
  timeZone: string
): Date {
  const sameTime = atZonedTime(
    day.date,
    formatClock(start, timeZone),
    timeZone
  );
  return sameTime >= day.start && sameTime < day.end ? sameTime : day.start;
}
