/**
 * Daily productivity aggregation.
 *
 * Like the scheduling engine, this is a pure deterministic function: no Prisma,
 * no clock reads. The caller decides what "today" means and passes in already
 * filtered, lightweight data. All durations are integer minutes.
 */

// 1. INPUT TYPES
export type FocusEntry = {
  duration: number | null; // Minutes. Null = an entry that was never closed.
};

export type PlannedBlock = {
  startTime: Date;
  endTime: Date;
};

export type DailySummaryInput = {
  focusEntries: FocusEntry[]; // TimeEntries that started today
  completedTaskCount: number; // Tasks marked COMPLETED today
  activeTaskCount: number; // Tasks still TODO / IN_PROGRESS
  scheduledBlocks: PlannedBlock[]; // Engine output for the rest of today
};

// 2. OUTPUT TYPE
export type DailySummary = {
  focusedMinutes: number; // Actual executed time today
  scheduledMinutes: number; // Time the engine still has planned today
  completedTasks: number;
  plannedTasks: number; // completed + still active
  completionRate: number; // Integer percentage 0-100
};

// 3. THE AGGREGATION FUNCTION
export function summarizeDay(input: DailySummaryInput): DailySummary {
  // Unclosed entries (null duration) contribute nothing rather than crashing the sum.
  const focusedMinutes = input.focusEntries.reduce(
    (total, entry) => total + (entry.duration ?? 0),
    0
  );

  // Engine blocks are minute-aligned, but round defensively so we never emit a float.
  const scheduledMinutes = input.scheduledBlocks.reduce(
    (total, block) =>
      total +
      Math.round((block.endTime.getTime() - block.startTime.getTime()) / 60000),
    0
  );

  const completedTasks = input.completedTaskCount;
  const plannedTasks = completedTasks + input.activeTaskCount;

  // Guard the divide-by-zero case: an empty day is 0%, not NaN.
  const completionRate =
    plannedTasks === 0 ? 0 : Math.round((completedTasks / plannedTasks) * 100);

  return {
    focusedMinutes,
    scheduledMinutes,
    completedTasks,
    plannedTasks,
    completionRate,
  };
}
