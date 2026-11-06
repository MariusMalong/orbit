// Display formatting helpers. Data stays as Dates and integer minutes; these only render it.

import { getZonedParts } from '@/lib/time/zoned';

// Server components pass the visitor's timezone; without one, the runtime's
// own timezone is used (the browser's, in client components).

/** 24-hour clock time, e.g. "09:00". */
export function formatClock(date: Date, timeZone?: string): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });
}

/** Short day label, e.g. "Wed 4 Nov". */
export function formatShortDay(date: Date, timeZone?: string): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone,
  });
}

/** "Due 11:00" when the deadline is today, otherwise "Due Mon 9 Nov, 17:00". */
export function formatDue(deadline: Date, now: Date, timeZone: string): string {
  const d = getZonedParts(deadline, timeZone);
  const n = getZonedParts(now, timeZone);
  const isToday = d.year === n.year && d.month === n.month && d.day === n.day;
  const time = formatClock(deadline, timeZone);
  return isToday
    ? `Due ${time}`
    : `Due ${formatShortDay(deadline, timeZone)}, ${time}`;
}

/** Local date-time in the format a datetime-local input expects, e.g. "2026-11-05T14:30". */
export function formatForDateTimeInput(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Integer minutes as "45m" or "2h 05m". */
export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

export const PRIORITY_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
};
