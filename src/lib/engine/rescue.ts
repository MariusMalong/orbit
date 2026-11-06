import type { SchedulableTask, TimeWindow } from './scheduler';
import { generateMultiDaySchedule, type PlanningDay } from './multi-day';

const HIGH_PRIORITY = 3;

/**
 * Whether raising a late task to high priority would get it done by its
 * deadline, without making any other task late. The planner is run again with
 * just that one change, so the "Make it high priority" button is only
 * offered when it really fixes the problem.
 */
export function raisingPriorityHelps(
  taskId: string,
  tasks: SchedulableTask[],
  commitments: TimeWindow[],
  days: PlanningDay[]
): boolean {
  const target = tasks.find((t) => t.id === taskId);
  if (!target || target.priority >= HIGH_PRIORITY) return false;

  const before = new Set(
    generateMultiDaySchedule(tasks, commitments, days).lateTaskIds
  );
  const after = generateMultiDaySchedule(
    tasks.map((t) => (t.id === taskId ? { ...t, priority: HIGH_PRIORITY } : t)),
    commitments,
    days
  ).lateTaskIds;

  return !after.includes(taskId) && after.every((id) => before.has(id));
}
