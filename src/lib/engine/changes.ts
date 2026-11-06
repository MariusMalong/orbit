import type { MultiDayResult } from './multi-day';

export type DeadlineChanges = {
  /** Tasks started before their deadline day so they can be done in time. */
  startedEarly: { taskId: string; firstDayIndex: number }[];
  /**
   * Tasks that now finish on a later day than they would have by priority
   * alone, because deadline work took their place. `toDayIndex` is null when
   * the task no longer finishes within the planned days.
   */
  movedLater: {
    taskId: string;
    fromDayIndex: number;
    toDayIndex: number | null;
  }[];
};

/** The day each task's last block falls on, if it's fully planned. */
function finishDays(plan: MultiDayResult): Map<string, number> {
  const unfinished = new Set(plan.unscheduledTaskIds);
  const days = new Map<string, number>();
  for (const block of plan.scheduledBlocks) {
    if (unfinished.has(block.taskId)) continue;
    days.set(
      block.taskId,
      Math.max(days.get(block.taskId) ?? 0, block.dayIndex)
    );
  }
  return days;
}

/**
 * What planning around deadlines changed, compared with planning each day by
 * priority alone, so the page can say what moved and why.
 */
export function deadlineChanges(
  plan: MultiDayResult,
  priorityOnly: MultiDayResult
): DeadlineChanges {
  const startedEarly = plan.startedEarlyTaskIds.map((taskId) => ({
    taskId,
    firstDayIndex: Math.min(
      ...plan.scheduledBlocks
        .filter((b) => b.taskId === taskId)
        .map((b) => b.dayIndex)
    ),
  }));

  const early = new Set(plan.startedEarlyTaskIds);
  const before = finishDays(priorityOnly);
  const after = finishDays(plan);
  const movedLater: DeadlineChanges['movedLater'] = [];
  for (const [taskId, fromDayIndex] of before) {
    if (early.has(taskId)) continue;
    const toDayIndex = after.get(taskId) ?? null;
    if (toDayIndex === null || toDayIndex > fromDayIndex) {
      movedLater.push({ taskId, fromDayIndex, toDayIndex });
    }
  }

  return { startedEarly, movedLater };
}
