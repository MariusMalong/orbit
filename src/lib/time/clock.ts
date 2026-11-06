// Wall-clock helpers for "HH:MM" strings, as used by time inputs.

import { getZonedParts } from '@/lib/time/zoned';

const pad = (n: number) => n.toString().padStart(2, '0');

const LAST_MINUTE = 23 * 60 + 59;

function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(total: number): string {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** The next whole or half hour after a time, e.g. "10:05" → "10:30". Stays within the day. */
export function nextHalfHour(hhmm: string): string {
  const next = Math.floor(toMinutes(hhmm) / 30) * 30 + 30;
  return fromMinutes(Math.min(next, LAST_MINUTE));
}

/** Adds minutes to a time, stopping at 23:59 rather than wrapping into the next day. */
export function addMinutesToClock(hhmm: string, minutes: number): string {
  return fromMinutes(Math.min(toMinutes(hhmm) + minutes, LAST_MINUTE));
}

/** True when `end` is later in the day than `start`. */
export function isAfter(end: string, start: string): boolean {
  return toMinutes(end) > toMinutes(start);
}

/** The calendar date of an instant in a timezone, as a date input expects: "2026-11-06". */
export function toDateKey(date: Date, timeZone: string): string {
  const { year, month, day } = getZonedParts(date, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}
