import { planningStart } from '@/lib/engine/scheduler';
import type { PlanningDay } from '@/lib/engine/multi-day';
import { getZonedParts, zonedWallTimeToDate } from '@/lib/time/zoned';

// Turns the user's weekly working hours into concrete planning days, in their
// timezone. Kept apart from the engine so the engine never deals with
// timezones, only instants.

export type DayHours = { startTime: string; endTime: string }; // "HH:MM"

/** Working hours by weekday (0 = Sunday). Missing days use DEFAULT_HOURS. */
export type WeeklyHours = Partial<Record<number, DayHours>>;

export const DEFAULT_HOURS: DayHours = { startTime: '09:00', endTime: '17:00' };

export type PlanningDayInfo = PlanningDay & {
  date: Date; // Midnight at the start of the calendar day
  weekday: number; // 0 = Sunday
  workDayStart: Date; // Start of working hours, even if planning starts later
  hours: DayHours;
};

const parseHHMM = (value: string) => value.split(':').map(Number);

/**
 * `count` planning days starting today. Today's planning starts from now
 * (see planningStart); later days start at the beginning of their workday.
 */
export function buildPlanningDays(
  now: Date,
  timeZone: string,
  weeklyHours: WeeklyHours,
  count = 7
): PlanningDayInfo[] {
  const today = getZonedParts(now, timeZone);

  return Array.from({ length: count }, (_, i) => {
    const weekday = (today.weekday + i) % 7;
    const hours = weeklyHours[weekday] ?? DEFAULT_HOURS;
    const [startHour, startMinute] = parseHHMM(hours.startTime);
    const [endHour, endMinute] = parseHHMM(hours.endTime);
    // zonedWallTimeToDate rolls day + i over into the next month as needed.
    const at = (hour: number, minute: number, dayOffset = 0) =>
      zonedWallTimeToDate(
        today.year,
        today.month,
        today.day + i + dayOffset,
        hour,
        minute,
        timeZone
      );

    const workDayStart = at(startHour, startMinute);
    const end = at(endHour, endMinute);

    return {
      date: at(0, 0),
      weekday,
      hours,
      workDayStart,
      start: i === 0 ? planningStart(now, workDayStart) : workDayStart,
      end,
      urgentUntil: at(0, 0, 1),
    };
  });
}
