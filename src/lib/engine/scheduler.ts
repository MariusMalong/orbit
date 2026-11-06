// 1. INPUT TYPES
export type SchedulableTask = {
  id: string;
  title: string;
  durationEstimate: number; // In minutes
  priority: number; // 3 = High, 1 = low
  deadline?: Date | null; // Optional: when the task has to be finished by
};

export type TimeWindow = {
  start: Date;
  end: Date;
};

// 2. OUTPUT TYPES
export type ScheduleBlockResult = {
  taskId: string;
  startTime: Date;
  endTime: Date;
};

export type ScheduleResult = {
  scheduledBlocks: ScheduleBlockResult[];
  bumpedTaskIds: string[]; // Tasks that didn't fit in the day
  lateTaskIds: string[]; // Tasks that won't be finished by their deadline
};

export type ScheduleOptions = {
  /**
   * The shortest block worth scheduling, in minutes. A shorter block is only
   * created when it's the whole task. Defaults to 15.
   */
  minBlockMinutes?: number;
  /**
   * Tasks due at or before this are urgent and are planned first, earliest
   * deadline first. Usually the end of the user's day. Defaults to the end of
   * the workday.
   */
  urgentUntil?: Date;
};

const DEFAULT_MIN_BLOCK_MINUTES = 15;

// 3. THE ENGINE

const PLANNING_STEP_MINUTES = 5;

/**
 * Where today's plan should begin: the start of the workday, or, once the day
 * has started, the current time rounded up to the next 5 minutes (so blocks
 * start on tidy times like 14:35 rather than 14:32). Time that has already
 * passed can't be planned. If this is at or after the end of the workday,
 * there's nothing left to plan and every task is bumped.
 */
export function planningStart(now: Date, workDayStart: Date): Date {
  const stepMs = PLANNING_STEP_MINUTES * 60000;
  const roundedNow = new Date(Math.ceil(now.getTime() / stepMs) * stepMs);
  return roundedNow > workDayStart ? roundedNow : new Date(workDayStart);
}

/**
 * Returns the free gaps in the workday left after removing fixed commitments.
 */
export function calculateFreeWindows(
  workDayStart: Date,
  workDayEnd: Date,
  commitments: TimeWindow[]
): TimeWindow[] {
  const freeWindows: TimeWindow[] = [];

  // Create a moving pointer starting at the beginning of the day
  let currentTime = new Date(workDayStart);

  // 1. Sort commitments chronologically by start time
  const sortedCommitments = [...commitments].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  // 2. Walk the timeline
  for (const commitment of sortedCommitments) {
    // Commitments are sorted, so once one starts at or after the end of the
    // workday, none of the rest can affect today's windows. Stopping here also
    // stops a gap from stretching past workDayEnd up to an evening (or
    // next-day) commitment; step 3 closes the last window at workDayEnd.
    if (commitment.start >= workDayEnd) break;

    // If pointer is before the commitment starts, there's a free gap
    if (currentTime < commitment.start) {
      freeWindows.push({
        start: new Date(currentTime),
        end: new Date(commitment.start),
      });
    }

    // Move pointer to the end of this commitment.
    // (Only move it if the commitment ends AFTER the pointer,
    // which protects against weird overlapping events).
    if (currentTime < commitment.end) {
      currentTime = new Date(commitment.end);
    }
  }

  // 3. After the loop, check if there's time left before the workday ends
  if (currentTime < workDayEnd) {
    freeWindows.push({
      start: new Date(currentTime),
      end: new Date(workDayEnd),
    });
  }

  return freeWindows;
}

/**
 * The order tasks are planned in. Two tiers:
 *
 * 1. Urgent tasks (due by `urgentUntil`, including overdue ones) come
 *    first, earliest deadline first, then higher priority. Within a single day
 *    this is "earliest deadline first", which keeps lateness as low as
 *    possible when work can be split across gaps.
 * 2. Everything else: higher priority first, then earlier deadline (tasks
 *    without one last).
 *
 * Ties keep the input order (Array.prototype.sort is stable).
 */
export function compareTasks(
  a: SchedulableTask,
  b: SchedulableTask,
  urgentUntil: Date
): number {
  const aUrgent = a.deadline != null && a.deadline <= urgentUntil;
  const bUrgent = b.deadline != null && b.deadline <= urgentUntil;
  if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;

  if (aUrgent && bUrgent) {
    const byDeadline = a.deadline!.getTime() - b.deadline!.getTime();
    return byDeadline || b.priority - a.priority;
  }

  const byPriority = b.priority - a.priority;
  if (byPriority) return byPriority;
  if (a.deadline && b.deadline) {
    return a.deadline.getTime() - b.deadline.getTime();
  }
  if (a.deadline) return -1;
  if (b.deadline) return 1;
  return 0;
}

/**
 * Deterministic scheduling algorithm: slots tasks into the free gaps of the
 * workday (urgent deadlines first, then by priority), splitting a task across
 * gaps when needed. Reports tasks that don't fit as bumped, and tasks that
 * won't be finished by their deadline as late.
 */
export function generateSchedule(
  tasks: SchedulableTask[],
  commitments: TimeWindow[],
  workDayStart: Date,
  workDayEnd: Date,
  options: ScheduleOptions = {}
): ScheduleResult {
  const minBlock = options.minBlockMinutes ?? DEFAULT_MIN_BLOCK_MINUTES;
  const urgentUntil = options.urgentUntil ?? workDayEnd;

  const scheduledBlocks: ScheduleBlockResult[] = [];
  const bumpedTaskIds: string[] = [];
  const lateTaskIds: string[] = [];

  // Step 1 - Calculate Free Time Windows
  const availableWindows = calculateFreeWindows(
    workDayStart,
    workDayEnd,
    commitments
  );

  // Step 2 - Order the tasks: urgent deadlines first, then by priority
  const sortedTasks = [...tasks].sort((a, b) =>
    compareTasks(a, b, urgentUntil)
  );

  // Step 3 - Slotting Loop
  for (const task of sortedTasks) {
    let remainingMinutes = task.durationEstimate;
    let finishedAt: Date | null = null;

    // Try to fit the task into available free time windows
    for (let i = 0; i < availableWindows.length; i++) {
      if (remainingMinutes <= 0) break; // Task is fully scheduled, move to the next task

      const window = availableWindows[i];

      // Calculate how many minutes are left in this specific window
      const windowDurationMs = window.end.getTime() - window.start.getTime();
      const windowDurationMinutes = Math.floor(windowDurationMs / 60000);

      if (windowDurationMinutes <= 0) continue; // Window is full, check the next one

      // Determine how much of the task to put in this window. If the rest of
      // the task fits, it all goes in. Otherwise the task is split, and both
      // this piece and the piece left over must be at least minBlock long, so
      // no slivers appear before a commitment or at the end of a task. (A
      // task shorter than minBlock to begin with is only ever placed whole.)
      let minutesToUse: number;
      if (remainingMinutes <= windowDurationMinutes) {
        minutesToUse = remainingMinutes;
      } else {
        minutesToUse = Math.min(
          windowDurationMinutes,
          remainingMinutes - minBlock
        );
        if (minutesToUse < minBlock) continue; // Too small to be worth a block
      }

      // Calculate exact start and end dates for this block
      const blockStart = new Date(window.start);
      const blockEnd = new Date(blockStart.getTime() + minutesToUse * 60000);

      // Slot it into the schedule
      scheduledBlocks.push({
        taskId: task.id,
        startTime: blockStart,
        endTime: blockEnd,
      });

      // Shrink the available window so the next task doesn't overlap
      window.start = blockEnd;

      // Deduct the scheduled time from the task's total duration
      remainingMinutes -= minutesToUse;
      if (remainingMinutes === 0) finishedAt = blockEnd;
    }

    // Step 4 - Spillover Check
    // If every window is checked and the task still isn't finished, it gets bumped
    if (remainingMinutes > 0) {
      bumpedTaskIds.push(task.id);
    }

    // Step 5 - Deadline Check
    // Late if it finishes after its deadline, or if it was due today (by
    // urgentUntil) but couldn't be finished today at all.
    if (task.deadline) {
      const isLate = finishedAt
        ? finishedAt > task.deadline
        : task.deadline <= urgentUntil;
      if (isLate) lateTaskIds.push(task.id);
    }
  }

  return {
    scheduledBlocks,
    bumpedTaskIds,
    lateTaskIds,
  };
}
