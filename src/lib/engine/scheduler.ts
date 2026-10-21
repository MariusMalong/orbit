// 1. INPUT TYPES
export type SchedulableTask = {
    id: string;
    title: string;
    durationEstimate: number; // In minutes
    priority: number;         // 3 = High, 1 = low
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
}

// 3. THE ENGINE FUNCTION (Skeleton)
/**
 * Deterministic scheduling algorithm.
 * Takes a list of tasks and fixed commitments, and calculates a daily schedule.
 */

/**
 * Helper: Calculates available gaps in the day by subtracting commitments.
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
        // If pointer is before the commitment starts, theres a free gap
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

export function generateSchedule(
    tasks: SchedulableTask[],
    commitments: TimeWindow[],
    workDayStart: Date,
    workDayEnd: Date
): ScheduleResult {

    const scheduledBlocks: ScheduleBlockResult[] = [];
    const bumpedTaskIds: string[] = [];

    // Step 1 - Calculate Free Time Windows
    const availableWindows = calculateFreeWindows(workDayStart, workDayEnd, commitments);

    // Step 2 - Sort Tasks by Priority (Highest number first)
    const sortedTasks = [...tasks].sort((a, b) => b.priority - a.priority);

    // Step 3 - Slotting Loop
    for (const task of sortedTasks) {
        let remainingMinutes = task.durationEstimate;

        // Try to fit the task into available free time windows
        for (let i = 0; i < availableWindows.length; i++) {
            if (remainingMinutes <= 0) break; // Task is fully scheduled, move to the next task
            
            const window = availableWindows[i];

            // Calculate how many minutes are left in this specific window
            const windowDurationMs = window.end.getTime() - window.start.getTime();
            const windowDurationMinutes = Math.floor(windowDurationMs / 60000);

            if (windowDurationMinutes <= 0) continue; // Window is full, check the next one

            // Determine how much of the task can fit in this window
            const minutesToUse = Math.min(remainingMinutes, windowDurationMinutes);

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
        }

        // Step 4 - Spillover Check
        // If every window is checked and the task still isn't finished, it gets bumped
        if (remainingMinutes > 0) {
            bumpedTaskIds.push(task.id);
        }
    }

    return {
        scheduledBlocks,
        bumpedTaskIds
    };
}