import {
  generateSchedule,
  SchedulableTask,
  ScheduleBlockResult,
  TimeWindow,
} from './scheduler';
import { mustPlanToday } from './reservations';

// Multi-day planning, built on the single-day engine.
//
// The plan rolls forward one day at a time: each day, generateSchedule plans
// whatever work is still open, in that day's own working hours, and anything
// that doesn't fit carries over to the next day. Because "urgent" means "due
// by the end of that day", a task due on Wednesday is planned by priority on
// Monday and Tuesday and jumps the queue on Wednesday.
//
// On its own, that would leave a big task due Wednesday until Wednesday. So
// each day starts with the deadline work that can't wait (see
// reservations.ts): whatever won't fit into the free time between tomorrow
// and the deadline is planned first, earliest deadline first, and the rest
// of the day is filled by priority as usual.
//
// Before any of that, tasks the user has placed themselves (by dragging them
// to a time, or setting a start in the edit dialog) are planned at that time
// and treated like events by everything else. A placed task that doesn't fit
// before the end of its day carries on in the following days.
//
// Deadlines are then checked against when each task actually finishes, so a
// task that still can't make it, even when started early, is reported now.

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
  // Tasks given time on a day before their deadline day because the later
  // days wouldn't have had enough room: started early to meet the deadline.
  startedEarlyTaskIds: string[];
};

export type MultiDayOptions = {
  minBlockMinutes?: number;
  /**
   * Plan deadline work that can't wait first each day (the default). Off,
   * each day is planned by priority alone, which the page uses to show what
   * moved because of a deadline.
   */
  planForDeadlines?: boolean;
};

// Treat every deadline as urgent, so must-do work is ordered by deadline.
const FAR_FUTURE = new Date(8.64e15);
const DEFAULT_MIN_BLOCK_MINUTES = 15;

const MS_PER_MINUTE = 60_000;

const minutesOf = (block: ScheduleBlockResult) =>
  Math.round(
    (block.endTime.getTime() - block.startTime.getTime()) / MS_PER_MINUTE
  );

/**
 * The day a placed task starts on, or null if its start no longer applies:
 * it's after the planned days, or it's in the past and would already have
 * ended. A start earlier today that would still be running is kept, and the
 * task is planned from now.
 */
export function plannedDayIndex(
  plannedStart: Date,
  durationMinutes: number,
  days: PlanningDay[]
): number | null {
  if (days.length === 0) return null;
  const wouldEnd = plannedStart.getTime() + durationMinutes * MS_PER_MINUTE;
  if (plannedStart < days[0].start && wouldEnd <= days[0].start.getTime()) {
    return null;
  }
  const index = days.findIndex((day) => plannedStart < day.urgentUntil);
  return index === -1 ? null : index;
}

export function generateMultiDaySchedule(
  tasks: SchedulableTask[],
  commitments: TimeWindow[],
  days: PlanningDay[],
  options: MultiDayOptions = {}
): MultiDayResult {
  const minBlockMinutes = options.minBlockMinutes ?? DEFAULT_MIN_BLOCK_MINUTES;
  const planForDeadlines = options.planForDeadlines ?? true;
  const remaining = new Map(tasks.map((t) => [t.id, t.durationEstimate]));
  const finishedAt = new Map<string, Date>();
  const scheduledBlocks: DayBlock[] = [];
  const startedEarly = new Set<string>();
  // Placed tasks only continue after the day they were placed on.
  const placedOn = new Map<string, number>();

  const record = (blocks: ScheduleBlockResult[], dayIndex: number) => {
    for (const block of blocks) {
      scheduledBlocks.push({ ...block, dayIndex });
      const left = remaining.get(block.taskId)! - minutesOf(block);
      remaining.set(block.taskId, left);
      if (left === 0) finishedAt.set(block.taskId, block.endTime);
    }
  };

  // Pass 0: tasks the user placed, in the order they start. Each one fills
  // the free time from its start to the end of that day, around events and
  // the tasks placed before it.
  let fixed = commitments;
  const placed = tasks
    .flatMap((task) => {
      if (!task.plannedStart) return [];
      const dayIndex = plannedDayIndex(
        task.plannedStart,
        task.durationEstimate,
        days
      );
      return dayIndex === null
        ? []
        : [{ task, start: task.plannedStart, dayIndex }];
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  for (const { task, start, dayIndex } of placed) {
    const day = days[dayIndex];
    placedOn.set(task.id, dayIndex);
    const from = start > day.start ? start : day.start;
    if (from >= day.end) continue;
    const { scheduledBlocks: blocks } = generateSchedule(
      [task],
      fixed,
      from,
      day.end,
      { minBlockMinutes }
    );
    record(blocks, dayIndex);
    fixed = [
      ...fixed,
      ...blocks.map((b) => ({ start: b.startTime, end: b.endTime })),
    ];
  }

  // The open tasks that can be planned on `dayIndex`, with their estimate
  // cut down to what's still unplanned.
  const openTasks = (dayIndex: number) =>
    tasks
      .filter(
        (t) =>
          (remaining.get(t.id) ?? 0) > 0 &&
          (placedOn.get(t.id) ?? -1) < dayIndex
      )
      .map((t) => ({ ...t, durationEstimate: remaining.get(t.id)! }));

  days.forEach((day, dayIndex) => {
    if (day.start >= day.end) return; // No working time left that day

    if (openTasks(dayIndex).length === 0) return;

    // Pass 1: deadline work that can't wait, earliest deadline first.
    let busy = fixed;
    if (planForDeadlines) {
      const must = mustPlanToday(
        openTasks(dayIndex),
        remaining,
        days,
        dayIndex,
        fixed,
        minBlockMinutes
      );
      const mustTasks = openTasks(dayIndex)
        .filter((t) => must.has(t.id))
        .map((t) => ({ ...t, durationEstimate: must.get(t.id)! }));

      if (mustTasks.length > 0) {
        const { scheduledBlocks: reserved } = generateSchedule(
          mustTasks,
          fixed,
          day.start,
          day.end,
          { minBlockMinutes, urgentUntil: FAR_FUTURE }
        );
        record(reserved, dayIndex);
        for (const block of reserved) {
          const task = tasks.find((t) => t.id === block.taskId)!;
          if (task.deadline! >= day.urgentUntil) startedEarly.add(task.id);
        }
        busy = [
          ...fixed,
          ...reserved.map((b) => ({ start: b.startTime, end: b.endTime })),
        ];
      }
    }

    // Pass 2: everything else, by priority, in the time that's left.
    const { scheduledBlocks: blocks } = generateSchedule(
      openTasks(dayIndex),
      busy,
      day.start,
      day.end,
      { minBlockMinutes, urgentUntil: day.urgentUntil }
    );
    record(blocks, dayIndex);
  });

  // Blocks from the two passes are interleaved within a day; keep them in
  // time order.
  scheduledBlocks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

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

  return {
    scheduledBlocks,
    unscheduledTaskIds,
    lateTaskIds,
    startedEarlyTaskIds: tasks
      .filter((t) => startedEarly.has(t.id))
      .map((t) => t.id),
  };
}
