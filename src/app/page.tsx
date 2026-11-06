import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Timeline } from '@/components/timeline';
import { WorkdaySettings } from '@/components/workday-settings';
import { SchedulableTask, TimeWindow } from '@/lib/engine/scheduler';
import { generateMultiDaySchedule } from '@/lib/engine/multi-day';
import { buildPlanningDays, WeeklyHours } from '@/lib/planning/days';
import { dayLoads } from '@/lib/planning/load';
import { ComingUp } from '@/components/coming-up';
import { QuickAdd } from '@/components/quick-add';
import { TaskList } from '@/components/task-list';
import { WeekCard } from '@/components/week-card';
import { Popover } from '@/components/popover';
import { summarizeDay } from '@/lib/analytics/summarize';
import { formatDue, formatMinutes } from '@/lib/format';
import { getUserTimeZone } from '@/lib/time/user-timezone';
import { startOfNextZonedDay, startOfZonedDay } from '@/lib/time/zoned';
import { toDateKey } from '@/lib/time/clock';

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function ClockIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect('/signin');
  }

  // "Today" and the workday hours are in the visitor's timezone, not the
  // server's (Vercel runs in UTC).
  const timeZone = await getUserTimeZone();
  const today = new Date();

  // 1. Fetch data from database
  // IN_PROGRESS tasks (partially worked via the Focus Timer) still have remaining
  // time, so they must stay in the engine's input alongside untouched TODO tasks.
  const rawTasks = await prisma.task.findMany({
    where: {
      userId: session.user.id,
      status: { in: ['TODO', 'IN_PROGRESS'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rawCommitments = await prisma.fixedCommitment.findMany({
    where: { userId: session.user.id },
    orderBy: { startTime: 'asc' },
  });

  // Working hours for each day of the week (missing days use 09:00 - 17:00),
  // turned into the next 7 planning days in the visitor's timezone.
  const availability = await prisma.availability.findMany({
    where: { userId: session.user.id },
  });
  const weeklyHours: WeeklyHours = Object.fromEntries(
    availability.map((a) => [
      a.dayOfWeek,
      { startTime: a.startTime, endTime: a.endTime },
    ])
  );
  const days = buildPlanningDays(today, timeZone, weeklyHours);
  const todayPlan = days[0];
  const currentDayOfWeek = todayPlan.weekday; // 0 - 6
  const workDayStart = todayPlan.workDayStart;
  const workDayEnd = todayPlan.end;

  // 2. Map Prisma data to Engine types
  const schedulableTasks: SchedulableTask[] = rawTasks.map((t) => ({
    id: t.id,
    title: t.title,
    durationEstimate: t.durationEstimate,
    priority: t.priority,
    deadline: t.deadline,
  }));

  const timeWindows: TimeWindow[] = rawCommitments.map((c) => ({
    start: c.startTime,
    end: c.endTime,
  }));

  const startOfToday = startOfZonedDay(today, timeZone);
  const startOfTomorrow = startOfNextZonedDay(today, timeZone);

  // 3. Run the Scheduling Engine over the next 7 days. Today is planned from
  // now (time that has passed can't be planned); whatever doesn't fit rolls
  // into the following days, and deadlines are checked against when each
  // task will actually finish.
  const planStart = todayPlan.start;
  const plan = generateMultiDaySchedule(schedulableTasks, timeWindows, days);
  const scheduledBlocks = plan.scheduledBlocks.filter((b) => b.dayIndex === 0);
  const laterBlocks = plan.scheduledBlocks.filter((b) => b.dayIndex > 0);
  const lateTaskIds = plan.lateTaskIds;

  // Tasks with time left after today, and when they continue (if this week).
  const leftovers = schedulableTasks.flatMap((task) => {
    const minutesToday = scheduledBlocks
      .filter((b) => b.taskId === task.id)
      .reduce(
        (sum, b) => sum + (b.endTime.getTime() - b.startTime.getTime()) / 60000,
        0
      );
    const minutesLeft = Math.round(task.durationEstimate - minutesToday);
    if (minutesLeft <= 0) return [];
    const next = laterBlocks.find((b) => b.taskId === task.id);
    return [{ task, minutesLeft, continuesOn: next?.startTime ?? null }];
  });

  // 4. Analytics: aggregate today's executed time and task completion

  const [todaysEntries, completedTodayCount] = await Promise.all([
    // TimeEntry has no userId column, so ownership is enforced through the
    // parent Task relation. Only entries on this user's tasks can match.
    prisma.timeEntry.findMany({
      where: {
        task: { userId: session.user.id },
        startTime: { gte: startOfToday, lt: startOfTomorrow },
      },
      select: { duration: true },
    }),
    prisma.task.count({
      where: {
        userId: session.user.id,
        status: 'COMPLETED',
        completedAt: { gte: startOfToday, lt: startOfTomorrow },
      },
    }),
  ]);

  const summary = summarizeDay({
    focusEntries: todaysEntries,
    completedTaskCount: completedTodayCount,
    activeTaskCount: rawTasks.length,
    scheduledBlocks,
  });

  // How full each day is, for the "This week" chart.
  const loads = dayLoads(
    days,
    plan.scheduledBlocks.map((b) => ({
      start: b.startTime,
      end: b.endTime,
      dayIndex: b.dayIndex,
    })),
    timeWindows
  );

  // For tasks with nothing planned today: the day they're planned for, or
  // null if they don't fit this week.
  const nextPlanned = new Map<string, Date | null>();
  for (const task of schedulableTasks) {
    if (scheduledBlocks.some((b) => b.taskId === task.id)) continue;
    nextPlanned.set(
      task.id,
      laterBlocks.find((b) => b.taskId === task.id)?.startTime ?? null
    );
  }

  const lateTasks = schedulableTasks
    .filter((t) => lateTaskIds.includes(t.id))
    .map((t) => ({
      id: t.id,
      title: t.title,
      due: t.deadline
        ? formatDue(t.deadline, today, timeZone).replace(/^Due/, 'due')
        : '',
    }));

  const commitments = rawCommitments.map((c) => ({
    id: c.id,
    title: c.title,
    start: c.startTime,
    end: c.endTime,
  }));

  const todayLabel = today.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          {todayLabel}
        </h1>
        <p className="text-muted tabular-nums">
          {formatMinutes(summary.focusedMinutes)} focused ·{' '}
          {summary.completedTasks} of {summary.plannedTasks} done ·{' '}
          {formatMinutes(summary.scheduledMinutes)} planned
        </p>
        {session.user.isDemo && (
          <p className="basis-full text-sm text-muted">
            You&apos;re in a demo account filled with sample data. Change
            anything you like: it&apos;s deleted after 24 hours.
          </p>
        )}
      </div>

      <QuickAdd today={toDateKey(today, timeZone)} />

      <div className="flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-[999_1_560px]">
          <Timeline
            scheduledBlocks={scheduledBlocks}
            tasks={schedulableTasks}
            commitments={commitments}
            workDayStart={workDayStart}
            workDayEnd={workDayEnd}
            now={today}
            planStart={planStart}
            timeZone={timeZone}
            headerAction={
              <Popover
                label={`Working hours for ${DAYS[currentDayOfWeek]}: ${todayPlan.hours.startTime} to ${todayPlan.hours.endTime}. Change`}
                triggerClassName="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm text-ink tabular-nums transition hover:bg-subtle focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
                trigger={
                  <>
                    <ClockIcon />
                    {todayPlan.hours.startTime}–{todayPlan.hours.endTime}
                  </>
                }
                panelClassName="right-0 w-max max-w-[calc(100vw-3rem)] p-3"
              >
                <WorkdaySettings
                  dayOfWeek={currentDayOfWeek}
                  dayName={DAYS[currentDayOfWeek]}
                  currentStart={todayPlan.hours.startTime}
                  currentEnd={todayPlan.hours.endTime}
                />
              </Popover>
            }
          />
          <ComingUp
            days={days.slice(1)}
            blocks={laterBlocks}
            tasks={schedulableTasks}
            events={commitments.filter((c) => c.start >= startOfTomorrow)}
            lateTaskIds={lateTaskIds}
            timeZone={timeZone}
          />
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
          <TaskList
            tasks={rawTasks}
            lateTaskIds={new Set(lateTaskIds)}
            nextPlanned={nextPlanned}
            tomorrow={startOfTomorrow}
            now={today}
            timeZone={timeZone}
          />
          <WeekCard
            days={days}
            loads={loads}
            lateTasks={lateTasks}
            leftovers={leftovers.map((l) => ({
              id: l.task.id,
              title: l.task.title,
              continuesOn: l.continuesOn,
            }))}
            timeZone={timeZone}
          />
        </div>
      </div>
    </div>
  );
}
