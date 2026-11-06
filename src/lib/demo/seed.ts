import { getZonedParts, zonedWallTimeToDate } from '@/lib/time/zoned';

// Sample data for "Try the demo" accounts.
//
// Pure and deterministic: given the current time it returns plain objects, and
// the server action writes them to the database.
//
// The dashboard plans from the current time, so a fixed 09:00–17:00 day would
// be empty or over for anyone visiting in the evening. Instead the demo's
// workday starts 30–60 minutes before the visitor arrives, and everything is
// placed relative to that start. Every visitor sees the same shape of day: a
// commitment coming up soon, tasks split around commitments, and one or two
// low-priority tasks that don't fit (see seed.test.ts, which checks this
// against the real scheduler).

export type DemoTimeEntry = {
  startTime: Date;
  endTime: Date;
  duration: number; // In minutes
};

export type DemoTask = {
  title: string;
  priority: number; // 3 = High, 1 = Low
  durationEstimate: number; // Minutes still to do, like a real task after focus time is logged
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  completedAt: Date | null;
  timeEntries: DemoTimeEntry[];
};

export type DemoCommitment = {
  title: string;
  startTime: Date;
  endTime: Date;
};

export type DemoAvailability = {
  dayOfWeek: number; // 0 = Sunday
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
};

export type DemoData = {
  availability: DemoAvailability;
  tasks: DemoTask[];
  commitments: DemoCommitment[];
};

const WORKDAY_MINUTES = 8 * 60;
// The workday has to end on the same day, so it can't start after 15:00.
const LATEST_START_MINUTES = 24 * 60 - WORKDAY_MINUTES - 60;

const toHHMM = (minutesOfDay: number) =>
  `${String(Math.floor(minutesOfDay / 60)).padStart(2, '0')}:${String(minutesOfDay % 60).padStart(2, '0')}`;

/**
 * The minute of the day (in the visitor's timezone) the demo workday starts:
 * the half hour before the current one, so "now" is 30–60 minutes in.
 */
export function demoWorkdayStart(now: Date, timeZone: string): number {
  const { hour, minute } = getZonedParts(now, timeZone);
  const currentHalfHour = Math.floor((hour * 60 + minute) / 30) * 30;
  return Math.min(Math.max(currentHalfHour - 30, 0), LATEST_START_MINUTES);
}

export function buildDemoData(now: Date, timeZone: string): DemoData {
  const { year, month, day, weekday } = getZonedParts(now, timeZone);
  const startMinute = demoWorkdayStart(now, timeZone);

  // A time `offset` minutes into the demo workday.
  const at = (offset: number) =>
    zonedWallTimeToDate(year, month, day, 0, startMinute + offset, timeZone);
  // A time `minutes` before now, for focus time already logged today. (In the
  // first hour or so after midnight this lands on the previous day, so the
  // stats just count less of it.)
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

  const availability: DemoAvailability = {
    dayOfWeek: weekday,
    startTime: toHHMM(startMinute),
    endTime: toHHMM(startMinute + WORKDAY_MINUTES),
  };

  const commitments: DemoCommitment[] = [
    // Starts 30–60 minutes after now, so the first block is a useful length.
    { title: 'Team check-in', startTime: at(90), endTime: at(120) },
    { title: 'Coffee with Sam', startTime: at(210), endTime: at(270) },
    { title: 'Dentist appointment', startTime: at(390), endTime: at(450) },
  ];

  const tasks: DemoTask[] = [
    {
      // Started earlier: 75 of 150 minutes already logged with the focus timer.
      title: 'Finish the quarterly report',
      priority: 3,
      durationEstimate: 75,
      status: 'IN_PROGRESS',
      completedAt: null,
      timeEntries: [{ startTime: ago(90), endTime: ago(15), duration: 75 }],
    },
    {
      title: "Prepare slides for Thursday's review",
      priority: 3,
      durationEstimate: 90,
      status: 'TODO',
      completedAt: null,
      timeEntries: [],
    },
    {
      title: "Plan next week's budget",
      priority: 2,
      durationEstimate: 60,
      status: 'TODO',
      completedAt: null,
      timeEntries: [],
    },
    {
      title: 'Reply to supplier emails',
      priority: 2,
      durationEstimate: 30,
      status: 'TODO',
      completedAt: null,
      timeEntries: [],
    },
    {
      title: 'Book flights for the conference',
      priority: 1,
      durationEstimate: 20,
      status: 'TODO',
      completedAt: null,
      timeEntries: [],
    },
    {
      title: 'Read the onboarding guide',
      priority: 1,
      durationEstimate: 45,
      status: 'TODO',
      completedAt: null,
      timeEntries: [],
    },
    {
      // Just finished, so the daily summary isn't empty.
      title: 'Pay the electricity bill',
      priority: 2,
      durationEstimate: 0,
      status: 'COMPLETED',
      completedAt: now,
      timeEntries: [{ startTime: ago(15), endTime: now, duration: 15 }],
    },
  ];

  return { availability, tasks, commitments };
}
