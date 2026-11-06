import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { TaskForm } from '@/components/task-form';
import { CommitmentForm } from '@/components/commitment-form';
import { Timeline } from '@/components/timeline';
import { EditTaskModal } from '@/components/edit-task-modal';
import { EditCommitmentModal } from '@/components/edit-commitment-modal';
import { WorkdaySettings } from '@/components/workday-settings';
import {
  generateSchedule,
  planningStart,
  SchedulableTask,
  TimeWindow,
} from '@/lib/engine/scheduler';
import { deleteTask, completeTask } from '@/app/actions/task';
import { deleteCommitment } from '@/app/actions/commitments';
import { FocusTimer } from '@/components/focus-timer';
import { StatsRow } from '@/components/stats-row';
import { summarizeDay } from '@/lib/analytics/summarize';
import {
  formatClock,
  formatDue,
  formatShortDay,
  PRIORITY_LABELS,
} from '@/lib/format';
import { getUserTimeZone } from '@/lib/time/user-timezone';
import {
  atZonedTime,
  getZonedParts,
  startOfNextZonedDay,
  startOfZonedDay,
} from '@/lib/time/zoned';
import {
  buttonSecondary,
  iconButtonDanger,
  panel,
  panelTitle,
} from '@/components/ui-classes';

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
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
  const currentDayOfWeek = getZonedParts(today, timeZone).weekday; // 0 - 6

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

  // Fetch Workday Availability for today (or fallback to 09:00 - 17:00)
  const availability = await prisma.availability.findFirst({
    where: {
      userId: session.user.id,
      dayOfWeek: currentDayOfWeek,
    },
  });

  const startTimeStr = availability?.startTime || '09:00';
  const endTimeStr = availability?.endTime || '17:00';

  // Turn the "HH:MM" availability strings into today's instants
  const workDayStart = atZonedTime(today, startTimeStr, timeZone);
  const workDayEnd = atZonedTime(today, endTimeStr, timeZone);

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

  // 3. Run the Scheduling Engine, from now (or the start of the workday if
  // it hasn't begun): time that has already passed can't be planned. Tasks
  // due before midnight are urgent and go first.
  const planStart = planningStart(today, workDayStart);
  const { scheduledBlocks, bumpedTaskIds, lateTaskIds } = generateSchedule(
    schedulableTasks,
    timeWindows,
    planStart,
    workDayEnd,
    { urgentUntil: startOfTomorrow }
  );
  const lateTasks = new Set(lateTaskIds);

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

  const todayLabel = today.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Page heading + daily analytics */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            {todayLabel}
          </h1>
          <p className="mt-1 text-muted">
            {session.user.isDemo
              ? "You're in a demo account filled with sample data. Change anything you like: it's deleted after 24 hours."
              : `Welcome back, ${session.user.name}`}
          </p>
        </div>
        <StatsRow summary={summary} />
      </div>

      <div className="flex flex-wrap items-start gap-5">
        {/* Main column: engine-generated timeline */}
        <div className="min-w-0 flex-[999_1_560px]">
          <Timeline
            scheduledBlocks={scheduledBlocks}
            bumpedTaskIds={bumpedTaskIds}
            lateTaskIds={lateTaskIds}
            tasks={schedulableTasks}
            commitments={rawCommitments.map((c) => ({
              id: c.id,
              title: c.title,
              start: c.startTime,
              end: c.endTime,
            }))}
            workDayStart={workDayStart}
            workDayEnd={workDayEnd}
            now={today}
            planStart={planStart}
            timeZone={timeZone}
            headerAction={
              <WorkdaySettings
                dayOfWeek={currentDayOfWeek}
                dayName={DAYS[currentDayOfWeek]}
                currentStart={startTimeStr}
                currentEnd={endTimeStr}
              />
            }
          />
        </div>

        {/* Sidebar: tasks and commitments */}
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
          <section aria-labelledby="active-tasks-heading" className={panel}>
            <h2 id="active-tasks-heading" className={`${panelTitle} mb-3`}>
              Active tasks
            </h2>
            {rawTasks.length === 0 ? (
              <p className="text-sm text-muted">
                No active tasks. Add one below and it will appear on your plan.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {rawTasks.map((task) => {
                  const isInProgress = task.status === 'IN_PROGRESS';
                  return (
                    <li
                      key={task.id}
                      className="flex flex-col gap-3 rounded-lg border border-line-soft p-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{task.title}</p>
                          <p className="text-sm text-muted">
                            {task.durationEstimate} min
                            {isInProgress ? ' left' : ''} ·{' '}
                            {PRIORITY_LABELS[task.priority] ?? task.priority}{' '}
                            priority
                          </p>
                          {task.deadline && (
                            <p
                              className={`text-sm ${lateTasks.has(task.id) ? 'font-medium text-danger' : 'text-muted'}`}
                            >
                              {formatDue(task.deadline, today, timeZone)}
                              {lateTasks.has(task.id) &&
                                " · won't be done in time"}
                            </p>
                          )}
                        </div>
                        {isInProgress && (
                          <span className="shrink-0 rounded-full bg-subtle px-2 py-0.5 text-xs text-ink-2">
                            In progress
                          </span>
                        )}
                      </div>
                      {/* Focus gets its own full-width row; the rest share the row below */}
                      <div className="flex flex-col gap-1.5">
                        <FocusTimer taskId={task.id} />
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
                          <EditTaskModal task={task} />
                          <form action={completeTask}>
                            <input
                              type="hidden"
                              name="taskId"
                              value={task.id}
                            />
                            <button
                              type="submit"
                              className={`${buttonSecondary} w-full`}
                            >
                              Done
                            </button>
                          </form>
                          <form action={deleteTask}>
                            <input
                              type="hidden"
                              name="taskId"
                              value={task.id}
                            />
                            <button
                              type="submit"
                              aria-label={`Delete ${task.title}`}
                              className={iconButtonDanger}
                            >
                              <TrashIcon />
                            </button>
                          </form>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <TaskForm />

          <section aria-labelledby="commitments-heading" className={panel}>
            <h2 id="commitments-heading" className={panelTitle}>
              Fixed commitments
            </h2>
            <p className="mt-1 mb-4 text-sm text-muted">
              Appointments and events the scheduler plans around.
            </p>

            {rawCommitments.length > 0 && (
              <ul className="mb-4 flex flex-col gap-2">
                {rawCommitments.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line-soft p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.title}</p>
                      <p className="text-sm text-muted">
                        {formatShortDay(c.startTime, timeZone)} ·{' '}
                        {formatClock(c.startTime, timeZone)} –{' '}
                        {formatClock(c.endTime, timeZone)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <EditCommitmentModal commitment={c} />
                      <form action={deleteCommitment}>
                        <input type="hidden" name="commitmentId" value={c.id} />
                        <button
                          type="submit"
                          aria-label={`Remove ${c.title}`}
                          className={iconButtonDanger}
                        >
                          <TrashIcon />
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <CommitmentForm />
          </section>
        </div>
      </div>
    </div>
  );
}
