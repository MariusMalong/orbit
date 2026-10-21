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
    let availableWindows = calculateFreeWindows(workDayStart, workDayEnd, commitments);

    // TODO: Step 2 - Sort Tasks by Priority
    // TODO: Step 3 - Loop through Tasks and slot them into Free Windows

    return {
        scheduledBlocks,
        bumpedTaskIds
    };
}