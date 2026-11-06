import { DEFAULT_HOURS, type DayHours, type WeeklyHours } from './days';

/** The order days are shown in the working-hours editor: Monday first. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export type WeekRow = Required<DayHours> & { dayOfWeek: number };

/** All seven days, filling in 09:00–17:00 workdays for any not saved yet. */
export function completeWeek(weeklyHours: WeeklyHours): WeekRow[] {
  return WEEK_ORDER.map((dayOfWeek) => {
    const hours = weeklyHours[dayOfWeek] ?? DEFAULT_HOURS;
    return {
      dayOfWeek,
      startTime: hours.startTime,
      endTime: hours.endTime,
      isDayOff: hours.isDayOff ?? false,
    };
  });
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Reads the working-hours form: for each day `day-<n>-start`, `day-<n>-end`
 * and a `day-<n>-on` checkbox (0 = Sunday). Every day must have valid times,
 * and a workday must end after it starts. A day off keeps its times, so
 * switching it back on restores them.
 */
export function parseWeeklyHoursForm(
  formData: FormData
): { rows: WeekRow[] } | { error: string } {
  const rows: WeekRow[] = [];

  for (const dayOfWeek of WEEK_ORDER) {
    const startTime = String(formData.get(`day-${dayOfWeek}-start`) ?? '');
    const endTime = String(formData.get(`day-${dayOfWeek}-end`) ?? '');
    const isDayOff = formData.get(`day-${dayOfWeek}-on`) !== 'on';

    if (!HHMM.test(startTime) || !HHMM.test(endTime)) {
      return { error: `${DAY_NAMES[dayOfWeek]} needs a start and end time.` };
    }
    if (!isDayOff && endTime <= startTime) {
      return {
        error: `${DAY_NAMES[dayOfWeek]} has to end after it starts.`,
      };
    }
    rows.push({ dayOfWeek, startTime, endTime, isDayOff });
  }

  if (rows.every((row) => row.isDayOff)) {
    return {
      error: 'Keep at least one working day, or nothing can be planned.',
    };
  }

  return { rows };
}
