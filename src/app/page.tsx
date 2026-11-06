import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Timeline } from '@/components/timeline';
import { WorkingHours } from '@/components/working-hours';
import { ComingUp } from '@/components/coming-up';
import { QuickAdd } from '@/components/quick-add';
import { FocusProvider } from '@/components/focus-context';
import { NowCard, type NowItem } from '@/components/now-card';
import { TaskList } from '@/components/task-list';
import { WeekCard } from '@/components/week-card';
import { summarizeDay } from '@/lib/analytics/summarize';
import { loadPlan } from '@/lib/planning/load-plan';
import { formatDue, formatMinutes } from '@/lib/format';
import { startOfNextZonedDay, startOfZonedDay } from '@/lib/time/zoned';
import { toDateKey } from '@/lib/time/clock';

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

  if (!session?.user?.id) {
    redirect('/signin');
  }

  const {
    timeZone,
    now: today,
    rawTasks,
    tasks: schedulableTasks,
    commitments,
    days,
    week,
    plan,
    loads,
  } = await loadPlan(session.user.id);

  const todayPlan = days[0];
  const workDayStart = todayPlan.workDayStart;
  const workDayEnd = todayPlan.workDayEnd; // The timeline shows the hours even on a day off
  const planStart = todayPlan.start;

  const startOfToday = startOfZonedDay(today, timeZone);
  const startOfTomorrow = startOfNextZonedDay(today, timeZone);

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

  // The rest of today for the phone's Now card: planned work and events that
  // haven't ended yet, in time order.
  const taskById = new Map(schedulableTasks.map((t) => [t.id, t]));
  const nowItems: NowItem[] = [
    ...scheduledBlocks.flatMap((b): NowItem[] => {
      const task = taskById.get(b.taskId);
      return task
        ? [{ kind: 'task', start: b.startTime, end: b.endTime, task }]
        : [];
    }),
    ...commitments
      .filter((c) => c.end > today && c.start < startOfTomorrow)
      .map((c): NowItem => ({
        kind: 'event',
        start: c.start,
        end: c.end,
        title: c.title,
      })),
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  const todayLabel = today.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  });

  return (
    <FocusProvider>
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

        {/* On phones, what to do now comes first; the timeline is further down. */}
        <div className="md:hidden">
          <NowCard
            items={nowItems}
            lateTaskIds={new Set(lateTaskIds)}
            isDayOff={todayPlan.isDayOff}
            now={today}
            timeZone={timeZone}
          />
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
              isDayOff={todayPlan.isDayOff}
              now={today}
              planStart={planStart}
              timeZone={timeZone}
              headerAction={
                <WorkingHours
                  week={week}
                  label={
                    todayPlan.isDayOff
                      ? 'Today is a day off. Change working hours'
                      : `Working hours today: ${todayPlan.hours.startTime} to ${todayPlan.hours.endTime}. Change working hours`
                  }
                  triggerClassName="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm text-ink tabular-nums transition hover:bg-subtle focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
                  trigger={
                    <>
                      <ClockIcon />
                      {todayPlan.isDayOff
                        ? 'Day off'
                        : `${todayPlan.hours.startTime}–${todayPlan.hours.endTime}`}
                    </>
                  }
                />
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
    </FocusProvider>
  );
}
