import { prisma } from '@/lib/prisma';
import type { SchedulableTask, TimeWindow } from '@/lib/engine/scheduler';
import { generateMultiDaySchedule } from '@/lib/engine/multi-day';
import { buildPlanningDays, type WeeklyHours } from '@/lib/planning/days';
import { dayLoads } from '@/lib/planning/load';
import { getUserTimeZone } from '@/lib/time/user-timezone';

/**
 * Everything the Today and Week pages need to draw the plan: the user's open
 * tasks, events and working hours, and the engine's plan for the next 7 days.
 *
 * Every query is scoped to `userId`, which must come from the server-side
 * session. Both pages use this, so they always show the same plan.
 */
export async function loadPlan(userId: string) {
  // "Today" and the workday hours are in the visitor's timezone, not the
  // server's (Vercel runs in UTC).
  const timeZone = await getUserTimeZone();
  const now = new Date();

  const [rawTasks, rawCommitments, availability] = await Promise.all([
    // IN_PROGRESS tasks (partially worked via the focus timer) still have
    // time left, so they're planned alongside untouched TODO tasks.
    prisma.task.findMany({
      where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.fixedCommitment.findMany({
      where: { userId },
      orderBy: { startTime: 'asc' },
    }),
    prisma.availability.findMany({ where: { userId } }),
  ]);

  // Working hours for each day of the week (missing days use 09:00 - 17:00),
  // turned into the next 7 planning days in the visitor's timezone.
  const weeklyHours: WeeklyHours = Object.fromEntries(
    availability.map((a) => [
      a.dayOfWeek,
      { startTime: a.startTime, endTime: a.endTime },
    ])
  );
  const days = buildPlanningDays(now, timeZone, weeklyHours);

  // Map Prisma rows to the engine's types.
  const tasks: SchedulableTask[] = rawTasks.map((t) => ({
    id: t.id,
    title: t.title,
    durationEstimate: t.durationEstimate,
    priority: t.priority,
    deadline: t.deadline,
  }));
  const commitments = rawCommitments.map((c) => ({
    id: c.id,
    title: c.title,
    start: c.startTime,
    end: c.endTime,
  }));
  const busy: TimeWindow[] = commitments.map((c) => ({
    start: c.start,
    end: c.end,
  }));

  // Today is planned from now (time that has passed can't be planned);
  // whatever doesn't fit rolls into the following days, and deadlines are
  // checked against when each task will actually finish.
  const plan = generateMultiDaySchedule(tasks, busy, days);

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
    plan,
    loads,
  };
}
