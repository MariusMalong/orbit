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

export function generateSchedule(
    tasks: SchedulableTask[],
    commitments: TimeWindow[],
    workDayStart: Date,
    workDayEnd: Date
): ScheduleResult {

    // Array to hold final placed blocks
    const scheduledBlocks: ScheduleBlockResult[] = [];

    // Array to hold tasks that don't fit
    const bumpedTaskIds: string[] = [];

    // TODO: Step 1 - Calculate Free Time Windows
    // TODO: Step 2 - Sort Tasks by Priority
    // TODO: Step 3 - Loop through Tasks and slot them into Free Windows

    return {
        scheduledBlocks,
        bumpedTaskIds
    };
}