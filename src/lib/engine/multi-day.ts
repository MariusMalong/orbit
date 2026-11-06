import {
  generateSchedule,
  SchedulableTask,
  ScheduleBlockResult,
  TimeWindow,
} from './scheduler';

// Multi-day planning, built on the single-day engine.
//
// The plan rolls forward one day at a time: each day, generateSchedule plans
// whatever work is still open, in that day's own working hours, and anything
// that doesn't fit carries over to the next day. Because "urgent" means "due
// by the end of that day", a task due on Wednesday is planned by priority on
// Monday and Tuesday and jumps the queue on Wednesday.
//
// Deadlines are then checked against when each task actually finishes, so a
// task due Wednesday that won't make it is reported on Monday. The planner
// flags that risk early; it doesn't reshuffle earlier days to rescue the task.

export type PlanningDay = {
  start: Date; // Where planning starts that day: now for today, otherwise the start of the workday
  end: Date; // End of that day's working hours
  urgentUntil: Date; // End of that calendar day: tasks due by then are urgent
};

export type DayBlock = ScheduleBlockResult & {
  dayIndex: number; // Index into the days passed in (0 = the first day)
};

export type MultiDayResult = {
  scheduledBlocks: DayBlock[];
  unscheduledTaskIds: string[]; // Tasks with time left over after the last day
  lateTaskIds: string[]; // Tasks that won't be finished by their deadline
};

const minutesOf = (block: ScheduleBlockResult) =>
  Math.round((block.endTime.getTime() - block.startTime.getTime()) / 60000);

export function generateMultiDaySchedule(
  tasks: SchedulableTask[],
  commitments: TimeWindow[],
  days: PlanningDay[],
  options: { minBlockMinutes?: number } = {}
): MultiDayResult {
  const remaining = new Map(tasks.map((t) => [t.id, t.durationEstimate]));
  const finishedAt = new Map<string, Date>();
  const scheduledBlocks: DayBlock[] = [];

  days.forEach((day, dayIndex) => {
    if (day.start >= day.end) return; // No working time left that day

    // The open tasks, with their estimate cut down to what's still unplanned.
    const open = tasks
      .filter((t) => (remaining.get(t.id) ?? 0) > 0)
      .map((t) => ({ ...t, durationEstimate: remaining.get(t.id)! }));
    if (open.length === 0) return;

    const { scheduledBlocks: blocks } = generateSchedule(
      open,
      commitments,
      day.start,
      day.end,
      { minBlockMinutes: options.minBlockMinutes, urgentUntil: day.urgentUntil }
    );

    for (const block of blocks) {
      scheduledBlocks.push({ ...block, dayIndex });
      const left = remaining.get(block.taskId)! - minutesOf(block);
      remaining.set(block.taskId, left);
      if (left === 0) finishedAt.set(block.taskId, block.endTime);
    }
  });

  const unscheduledTaskIds = tasks
    .filter((t) => (remaining.get(t.id) ?? 0) > 0)
    .map((t) => t.id);

  // Late if the task finishes after its deadline, or if it's due within the
  // planned days but doesn't finish within them. A task that's still open at
  // the end and due after the last day can't be judged yet.
  const horizonEnd = days.at(-1)?.urgentUntil;
  const lateTaskIds = tasks
    .filter((t) => {
      if (!t.deadline) return false;
      const finish = finishedAt.get(t.id);
      if (finish) return finish > t.deadline;
      return horizonEnd !== undefined && t.deadline <= horizonEnd;
    })
    .map((t) => t.id);

  return { scheduledBlocks, unscheduledTaskIds, lateTaskIds };
}
