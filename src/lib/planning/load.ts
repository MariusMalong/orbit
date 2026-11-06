import type { TimeWindow } from '@/lib/engine/scheduler';
import type { PlanningDay } from '@/lib/engine/multi-day';

export type DayLoad = {
  busyMinutes: number; // Planned work plus fixed commitments, inside the planning window
  capacityMinutes: number; // Length of the planning window
  percent: number; // busy / capacity as an integer 0-100; 100 when there's no time left
};

const MS_PER_MINUTE = 60_000;

/** Minutes of `window` that fall inside [start, end). */
function overlapMinutes(window: TimeWindow, start: Date, end: Date): number {
  const from = Math.max(window.start.getTime(), start.getTime());
  const to = Math.min(window.end.getTime(), end.getTime());
  return Math.max(0, Math.round((to - from) / MS_PER_MINUTE));
}

/**
 * How full each planning day is: the share of its planning window taken by
 * planned work and fixed commitments. For today the window starts at "now",
 * so the figure describes the rest of the day.
 *
 * Commitments may overlap each other, so busy time is measured as the union
 * of everything on the day rather than a plain sum.
 */
export function dayLoads(
  days: PlanningDay[],
  blocks: (TimeWindow & { dayIndex: number })[],
  commitments: TimeWindow[]
): DayLoad[] {
  return days.map((day, dayIndex) => {
    const capacityMinutes = Math.max(
      0,
      Math.round((day.end.getTime() - day.start.getTime()) / MS_PER_MINUTE)
    );
    if (capacityMinutes === 0) {
      return { busyMinutes: 0, capacityMinutes, percent: 100 };
    }

    const windows = [
      ...blocks.filter((b) => b.dayIndex === dayIndex),
      ...commitments,
    ]
      .filter((w) => overlapMinutes(w, day.start, day.end) > 0)
      .map((w) => ({
        start: w.start < day.start ? day.start : w.start,
        end: w.end > day.end ? day.end : w.end,
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    // Merge overlapping windows so shared time is only counted once.
    let busyMinutes = 0;
    let current: TimeWindow | null = null;
    for (const w of windows) {
      if (current && w.start <= current.end) {
        if (w.end > current.end) current.end = w.end;
        continue;
      }
      if (current) busyMinutes += overlapMinutes(current, day.start, day.end);
      current = { start: w.start, end: w.end };
    }
    if (current) busyMinutes += overlapMinutes(current, day.start, day.end);

    return {
      busyMinutes,
      capacityMinutes,
      percent: Math.min(100, Math.round((busyMinutes / capacityMinutes) * 100)),
    };
  });
}
