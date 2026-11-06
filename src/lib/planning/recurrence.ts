import { getZonedParts, zonedWallTimeToDate } from '@/lib/time/zoned';

// Weekly events are stored once (their first occurrence) and expanded into
// concrete occurrences when a page is planned. Weeks are counted in the
// user's timezone, so an event stays at 09:00 across daylight-saving changes.

export type StoredEvent = {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  repeatsWeekly: boolean;
  skippedStarts: Date[]; // Occurrences deleted or moved on their own
};

/** One concrete event on the calendar: a one-off event, or one week of a weekly one. */
export type EventOccurrence = {
  key: string; // Unique per occurrence, for React lists
  id: string; // The stored event
  title: string;
  start: Date;
  end: Date;
  repeatsWeekly: boolean;
};

const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/** The same wall-clock time `weeks` weeks later, in `timeZone`. */
function addWeeks(date: Date, weeks: number, timeZone: string): Date {
  const p = getZonedParts(date, timeZone);
  return zonedWallTimeToDate(
    p.year,
    p.month,
    p.day + weeks * 7,
    p.hour,
    p.minute,
    timeZone
  );
}

/**
 * Every occurrence that overlaps [from, to): one-off events as they are, and
 * each week of a weekly event, minus the skipped ones. Sorted by start.
 */
export function expandEvents(
  events: StoredEvent[],
  from: Date,
  to: Date,
  timeZone: string
): EventOccurrence[] {
  const occurrences: EventOccurrence[] = [];

  for (const event of events) {
    const duration = event.endTime.getTime() - event.startTime.getTime();
    const occurrence = (start: Date): EventOccurrence => ({
      key: `${event.id}:${start.getTime()}`,
      id: event.id,
      title: event.title,
      start,
      end: new Date(start.getTime() + duration),
      repeatsWeekly: event.repeatsWeekly,
    });

    if (!event.repeatsWeekly) {
      if (event.endTime > from && event.startTime < to) {
        occurrences.push(occurrence(event.startTime));
      }
      continue;
    }

    const skipped = new Set(event.skippedStarts.map((d) => d.getTime()));
    // Start a week early, because daylight saving can move a week's length
    // by an hour, and an occurrence can start before `from` and still overlap.
    const firstWeek = Math.max(
      0,
      Math.floor((from.getTime() - event.endTime.getTime()) / MS_PER_WEEK) - 1
    );
    for (let week = firstWeek; ; week++) {
      const start = addWeeks(event.startTime, week, timeZone);
      if (start >= to) break;
      const end = new Date(start.getTime() + duration);
      if (end > from && !skipped.has(start.getTime())) {
        occurrences.push(occurrence(start));
      }
    }
  }

  return occurrences.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Whole calendar days from `a` to `b` in `timeZone` (negative if `b` is earlier). */
function calendarDaysBetween(a: Date, b: Date, timeZone: string): number {
  const pa = getZonedParts(a, timeZone);
  const pb = getZonedParts(b, timeZone);
  return Math.round(
    (Date.UTC(pb.year, pb.month - 1, pb.day) -
      Date.UTC(pa.year, pa.month - 1, pa.day)) /
      MS_PER_DAY
  );
}

/**
 * New first occurrence for a weekly event when one of its occurrences is
 * edited and the change applies to all of them. The series moves by the same
 * number of days, takes the new time of day, and the new length, so editing
 * next Tuesday's 09:00 lecture to Wednesday 10:00 moves every week's.
 */
export function moveSeries(
  series: { startTime: Date },
  occurrenceStart: Date,
  editedStart: Date,
  editedEnd: Date,
  timeZone: string
): { startTime: Date; endTime: Date } {
  const days = calendarDaysBetween(occurrenceStart, editedStart, timeZone);
  const base = getZonedParts(series.startTime, timeZone);
  const time = getZonedParts(editedStart, timeZone);
  const startTime = zonedWallTimeToDate(
    base.year,
    base.month,
    base.day + days,
    time.hour,
    time.minute,
    timeZone
  );
  return {
    startTime,
    endTime: new Date(
      startTime.getTime() + (editedEnd.getTime() - editedStart.getTime())
    ),
  };
}
