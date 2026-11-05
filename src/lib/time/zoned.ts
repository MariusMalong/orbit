// Wall-clock maths in a specific timezone.
//
// The server (UTC on Vercel) and the person using Orbit are usually in
// different timezones. Instants are stored as Dates, but "today", "09:00" and
// "Friday" only mean something in the user's own timezone, so every conversion
// between the two goes through these helpers. They use only the built-in Intl
// API, and they handle daylight-saving changes.

/** Name of the cookie the browser sets with its IANA timezone, e.g. "Australia/Melbourne". */
export const TIMEZONE_COOKIE = 'tz';

export type ZonedParts = {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number; // 0–23
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday, like Date.getDay()
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'short',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** True if `timeZone` is an IANA name this runtime knows. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** The calendar date and clock time of `date` as seen in `timeZone`. */
export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: WEEKDAYS.indexOf(get('weekday')),
  };
}

// How far ahead of UTC `timeZone` is at `date`, in milliseconds.
function offsetMs(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone);
  const wallAsUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second
  );
  return wallAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * The instant when the clock in `timeZone` reads the given date and time.
 * Out-of-range days roll over like Date.UTC, so `day + 1` is tomorrow.
 */
export function zonedWallTimeToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  // First guess with the offset at the wall time, then correct it with the
  // offset at the guess, in case a daylight-saving change falls in between.
  const guess = wallAsUtc - offsetMs(new Date(wallAsUtc), timeZone);
  return new Date(wallAsUtc - offsetMs(new Date(guess), timeZone));
}

/** "HH:mm" on the same calendar day as `date`, in `timeZone`. */
export function atZonedTime(date: Date, hhmm: string, timeZone: string): Date {
  const [hour, minute] = hhmm.split(':').map(Number);
  const { year, month, day } = getZonedParts(date, timeZone);
  return zonedWallTimeToDate(year, month, day, hour, minute, timeZone);
}

/** Midnight at the start of `date`'s day in `timeZone`. */
export function startOfZonedDay(date: Date, timeZone: string): Date {
  const { year, month, day } = getZonedParts(date, timeZone);
  return zonedWallTimeToDate(year, month, day, 0, 0, timeZone);
}

/** Midnight at the start of the day after `date`'s day in `timeZone`. */
export function startOfNextZonedDay(date: Date, timeZone: string): Date {
  const { year, month, day } = getZonedParts(date, timeZone);
  return zonedWallTimeToDate(year, month, day + 1, 0, 0, timeZone);
}

/**
 * Parses a datetime-local input value ("2026-11-06T12:30") as a time in
 * `timeZone`. Returns null if the value isn't in that format.
 */
export function parseDateTimeLocal(
  value: string,
  timeZone: string
): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/.exec(
    value
  );
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  return zonedWallTimeToDate(year, month, day, hour, minute, timeZone);
}
