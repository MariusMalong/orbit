// Sample data for "Try the demo" accounts.
//
// Pure and deterministic: given the current time it returns plain objects, and
// the server action writes them to the database. The numbers are chosen so the
// default 09:00–17:00 workday shows off the engine: tasks are split around
// commitments, and the lowest-priority task doesn't fit and gets bumped
// (see seed.test.ts, which checks this against the real scheduler).

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
  timeEntries: DemoTimeEntry[];
};

export type DemoCommitment = {
  title: string;
  startTime: Date;
  endTime: Date;
};

export type DemoData = {
  tasks: DemoTask[];
  commitments: DemoCommitment[];
};

// A time on the same calendar day as `day`, in the server's timezone
// (the dashboard builds the workday the same way).
function on(day: Date, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const date = new Date(day);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function entry(day: Date, start: string, minutes: number): DemoTimeEntry {
  const startTime = on(day, start);
  return {
    startTime,
    endTime: new Date(startTime.getTime() + minutes * 60_000),
    duration: minutes,
  };
}

export function buildDemoData(now: Date): DemoData {
  const commitments: DemoCommitment[] = [
    {
      title: 'Team check-in',
      startTime: on(now, '09:30'),
      endTime: on(now, '10:00'),
    },
    {
      title: 'Lunch with Sam',
      startTime: on(now, '12:30'),
      endTime: on(now, '13:30'),
    },
    {
      title: 'Dentist appointment',
      startTime: on(now, '15:30'),
      endTime: on(now, '16:30'),
    },
  ];

  const tasks: DemoTask[] = [
    {
      // Started earlier: 45 of 150 minutes already logged with the focus timer.
      title: 'Finish the quarterly report',
      priority: 3,
      durationEstimate: 105,
      status: 'IN_PROGRESS',
      timeEntries: [entry(now, '07:30', 45)],
    },
    {
      title: "Prepare slides for Thursday's review",
      priority: 3,
      durationEstimate: 90,
      status: 'TODO',
      timeEntries: [],
    },
    {
      title: "Plan next week's budget",
      priority: 2,
      durationEstimate: 60,
      status: 'TODO',
      timeEntries: [],
    },
    {
      title: 'Reply to supplier emails',
      priority: 2,
      durationEstimate: 30,
      status: 'TODO',
      timeEntries: [],
    },
    {
      title: 'Book flights for the conference',
      priority: 1,
      durationEstimate: 20,
      status: 'TODO',
      timeEntries: [],
    },
    {
      title: 'Read the onboarding guide',
      priority: 1,
      durationEstimate: 45,
      status: 'TODO',
      timeEntries: [],
    },
    {
      // Already done today, so the daily summary isn't empty.
      title: 'Pay the electricity bill',
      priority: 2,
      durationEstimate: 0,
      status: 'COMPLETED',
      timeEntries: [entry(now, '08:15', 15)],
    },
  ];

  return { tasks, commitments };
}
