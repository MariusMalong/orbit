import { getZonedParts, zonedWallTimeToDate } from '@/lib/time/zoned';
import type { ProjectColor } from '@/lib/projects';

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
// low-priority tasks that don't fit, and a task with a deadline that jumps the
// queue, and one that won't make its deadline in two days' time (see
// seed.test.ts, which checks this
// against the real scheduler).

export type DemoTimeEntry = {
  startTime: Date;
  endTime: Date;
  duration: number; // In minutes
};

export type DemoProject = {
  key: string; // Tasks refer to their project by this
  name: string;
  color: ProjectColor;
};

export type DemoTask = {
  title: string;
  project: string | null; // A DemoProject key
  priority: number; // 3 = High, 1 = Low
  durationEstimate: number; // Minutes still to do, like a real task after focus time is logged
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  deadline: Date | null;
  completedAt: Date | null;
  timeEntries: DemoTimeEntry[];
};

export type DemoCommitment = {
  title: string;
  startTime: Date;
  endTime: Date;
  repeatsWeekly?: boolean;
};

export type DemoAvailability = {
  dayOfWeek: number; // 0 = Sunday
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  isDayOff: boolean;
};

export type DemoData = {
  availability: DemoAvailability[]; // Today's hours first, then the weekend off
  projects: DemoProject[];
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

  // Today's workday is built around now. The weekend is off, to show days
  // off on the Week page, unless the demo starts at the weekend.
  const availability: DemoAvailability[] = [
    {
      dayOfWeek: weekday,
      startTime: toHHMM(startMinute),
      endTime: toHHMM(startMinute + WORKDAY_MINUTES),
      isDayOff: false,
    },
    ...[6, 0]
      .filter((day) => day !== weekday)
      .map((dayOfWeek) => ({
        dayOfWeek,
        startTime: '09:00',
        endTime: '17:00',
        isDayOff: true,
      })),
  ];

  const commitments: DemoCommitment[] = [
    // Starts 30–60 minutes after now, so the first block is a useful length.
    // Weekly, so the demo shows a repeating event.
    {
      title: 'Team check-in',
      startTime: at(90),
      endTime: at(120),
      repeatsWeekly: true,
    },
    { title: 'Coffee with Sam', startTime: at(210), endTime: at(270) },
    { title: 'Dentist appointment', startTime: at(390), endTime: at(450) },
  ];

  const projects: DemoProject[] = [
    { key: 'work', name: 'Work', color: 'teal' },
    { key: 'personal', name: 'Personal', color: 'violet' },
  ];

  const tasks: DemoTask[] = [
    {
      // Started earlier: 75 of 150 minutes already logged with the focus timer.
      title: 'Finish the quarterly report',
      project: 'work',
      priority: 3,
      durationEstimate: 75,
      status: 'IN_PROGRESS',
      deadline: null,
      completedAt: null,
      timeEntries: [{ startTime: ago(90), endTime: ago(15), duration: 75 }],
    },
    {
      title: "Prepare slides for Thursday's review",
      project: 'work',
      priority: 3,
      durationEstimate: 90,
      status: 'TODO',
      deadline: null,
      completedAt: null,
      timeEntries: [],
    },
    {
      title: "Plan next week's budget",
      project: 'work',
      priority: 2,
      durationEstimate: 60,
      status: 'TODO',
      deadline: null,
      completedAt: null,
      timeEntries: [],
    },
    {
      // Medium priority, but due before the coffee meeting: the engine plans
      // it ahead of the high-priority tasks and it still finishes on time.
      title: 'Reply to supplier emails',
      project: 'work',
      priority: 2,
      durationEstimate: 30,
      status: 'TODO',
      deadline: at(180),
      completedAt: null,
      timeEntries: [],
    },
    {
      title: 'Book flights for the conference',
      project: 'personal',
      priority: 1,
      durationEstimate: 20,
      status: 'TODO',
      deadline: null,
      completedAt: null,
      timeEntries: [],
    },
    {
      title: 'Read the onboarding guide',
      project: 'work',
      priority: 1,
      durationEstimate: 45,
      status: 'TODO',
      deadline: null,
      completedAt: null,
      timeEntries: [],
    },
    {
      // Too big to finish before its deadline the day after tomorrow, so the
      // multi-day planner flags it as late today. (At most 45 minutes are free
      // for it today and 8 hours tomorrow, so at least 75 minutes remain on
      // the due day: it can't finish before 10:15.)
      title: 'Submit the grant application',
      project: 'work',
      priority: 1,
      durationEstimate: 600,
      status: 'TODO',
      deadline: zonedWallTimeToDate(year, month, day + 2, 10, 0, timeZone),
      completedAt: null,
      timeEntries: [],
    },
    {
      // Just finished, so the daily summary isn't empty.
      title: 'Pay the electricity bill',
      project: 'personal',
      priority: 2,
      durationEstimate: 0,
      status: 'COMPLETED',
      deadline: null,
      completedAt: now,
      timeEntries: [{ startTime: ago(15), endTime: now, duration: 15 }],
    },
  ];

  return { availability, projects, tasks, commitments };
}
