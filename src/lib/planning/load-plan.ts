import { prisma } from '@/lib/prisma';
import type { SchedulableTask, TimeWindow } from '@/lib/engine/scheduler';
import { generateMultiDaySchedule } from '@/lib/engine/multi-day';
import { deadlineChanges } from '@/lib/engine/changes';
import { buildPlanningDays, type WeeklyHours } from '@/lib/planning/days';
import { dayLoads } from '@/lib/planning/load';
import { completeWeek } from '@/lib/planning/weekly-hours';
import { getUserTimeZone } from '@/lib/time/user-timezone';
import { startOfZonedDay } from '@/lib/time/zoned';
import { expandEvents, type EventOccurrence } from '@/lib/planning/recurrence';
import {
  changesForShownDays,
  planForShownDays,
  planningDayCount,
  SHOWN_DAYS,
} from '@/lib/planning/horizon';

/**
 * Everything the Today and Week pages need to draw the plan: the user's open
 * tasks, events and working hours, and the engine's plan for the next 7 days
 * (made over a longer horizon when a deadline is further out).
 *
 * Every query is scoped to `userId`, which must come from the server-side
 * session. Both pages use this, so they always show the same plan.
 */
export async function loadPlan(userId: string) {
  // "Today" and the workday hours are in the visitor's timezone, not the
  // server's (Vercel runs in UTC).
  const timeZone = await getUserTimeZone();
  const now = new Date();
  const startOfToday = startOfZonedDay(now, timeZone);

  const [rawTasks, rawCommitments, availability] = await Promise.all([
    // IN_PROGRESS tasks (partially worked via the focus timer) still have
    // time left, so they're planned alongside untouched TODO tasks.
    prisma.task.findMany({
      where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } },
      orderBy: { createdAt: 'desc' },
    }),
    // Weekly events (which may have started long ago) and events that
    // haven't ended yet. Past one-off events aren't shown anywhere.
    prisma.fixedCommitment.findMany({
      where: {
        userId,
        OR: [{ repeatsWeekly: true }, { endTime: { gt: startOfToday } }],
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.availability.findMany({ where: { userId } }),
  ]);

  // Working hours and days off for each day of the week (missing days are
  // 09:00 - 17:00 workdays), turned into the next 7 planning days in the
  // visitor's timezone.
  const weeklyHours: WeeklyHours = Object.fromEntries(
    availability.map((a) => [
      a.dayOfWeek,
      { startTime: a.startTime, endTime: a.endTime, isDayOff: a.isDayOff },
    ])
  );

  // Map Prisma rows to the engine's types.
  const tasks: SchedulableTask[] = rawTasks.map((t) => ({
    id: t.id,
    title: t.title,
    durationEstimate: t.durationEstimate,
    priority: t.priority,
    deadline: t.deadline,
    plannedStart: t.plannedStart,
  }));

  // The days on screen, and the days planned: up to the latest deadline, so
  // work due in a few weeks gets started in time.
  const planningDays = buildPlanningDays(
    now,
    timeZone,
    weeklyHours,
    planningDayCount(tasks, startOfToday)
  );
  const days = planningDays.slice(0, SHOWN_DAYS);
  // Events this week, with each weekly event expanded into its occurrences,
  // followed by one-off events further ahead (for "Later" under Coming up).
  const weekEnd = days[days.length - 1].urgentUntil;
  const commitments: EventOccurrence[] = [
    ...expandEvents(rawCommitments, startOfToday, weekEnd, timeZone),
    ...rawCommitments
      .filter((c) => !c.repeatsWeekly && c.startTime >= weekEnd)
      .map((c) => ({
        key: c.id,
        id: c.id,
        title: c.title,
        start: c.startTime,
        end: c.endTime,
        repeatsWeekly: false,
      })),
  ];
  // Everything that blocks time over the whole planning horizon.
  const planningEnd = planningDays[planningDays.length - 1].urgentUntil;
  const busy: TimeWindow[] = expandEvents(
    rawCommitments,
    startOfToday,
    planningEnd,
    timeZone
  ).map((c) => ({ start: c.start, end: c.end }));

  // Today is planned from now (time that has passed can't be planned);
  // whatever doesn't fit rolls into the following days, and deadlines are
  // checked against when each task will actually finish.
  const fullPlan = generateMultiDaySchedule(tasks, busy, planningDays);
  // The same days planned by priority alone, to show what planning around
  // deadlines changed (what started early, and what moved later for it).
  const changes = changesForShownDays(
    deadlineChanges(
      fullPlan,
      generateMultiDaySchedule(tasks, busy, planningDays, {
        planForDeadlines: false,
      })
    )
  );
  const plan = planForShownDays(fullPlan, tasks, weekEnd);

  // How full each day is.
  const loads = dayLoads(
    days,
    plan.scheduledBlocks.map((b) => ({
      start: b.startTime,
      end: b.endTime,
      dayIndex: b.dayIndex,
    })),
    busy
  );

  return {
    timeZone,
    now,
    rawTasks,
    tasks,
    commitments,
    days,
    week: completeWeek(weeklyHours), // For the working-hours editor
    plan,
    changes,
    loads,
  };
}
