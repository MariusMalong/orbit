import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { QuickAdd } from '@/components/quick-add';
import { WeekBoard } from '@/components/week-board';
import { WorkingHours } from '@/components/working-hours';
import { buttonSecondary } from '@/components/ui-classes';
import {
  formatDayRange,
  formatDue,
  formatMinutes,
  formatShortDay,
} from '@/lib/format';
import { loadPlan } from '@/lib/planning/load-plan';
import type { SchedulableTask } from '@/lib/engine/scheduler';
import { toDateKey } from '@/lib/time/clock';

export const metadata: Metadata = {
  title: 'This week | Orbit',
};

export default async function WeekPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/signin');
  }
  // New accounts set up their hours and first tasks first.
  if (!session.user.onboarded) {
    redirect('/welcome');
  }

  const {
    timeZone,
    now,
    tasks,
    commitments,
    days,
    week,
    plan,
    changes,
    loads,
  } = await loadPlan(session.user.id);

  const lastDay = days[days.length - 1];
  const lateTasks = tasks.filter((t) => plan.lateTaskIds.includes(t.id));
  const notThisWeek = tasks.filter(
    (t) =>
      plan.unscheduledTaskIds.includes(t.id) && !plan.lateTaskIds.includes(t.id)
  );

  // The planner already starts deadline work as early as it needs to (see
  // src/lib/engine/reservations.ts), so a task that's still late doesn't fit
  // in the time before its deadline at all.
  const isOverdue = (task: SchedulableTask) =>
    !!task.deadline && task.deadline <= now;
  const lateMessage = (task: SchedulableTask) => {
    const due = task.deadline
      ? formatDue(task.deadline, now, timeZone).replace(/^Due /, '')
      : '';
    return isOverdue(task)
      ? `was due ${due}. It's planned as soon as possible.`
      : `won't be done by ${due}, even started as early as possible. Free up time before then or change your working hours.`;
  };

  // How a day is named in sentences: "today", "tomorrow", or "Mon 9 Nov".
  const dayName = (index: number) =>
    index === 0
      ? 'today'
      : index === 1
        ? 'tomorrow'
        : formatShortDay(days[index].date, timeZone);
  const weekEnd = lastDay.urgentUntil;
  const minutesThisWeek = (taskId: string) =>
    plan.scheduledBlocks
      .filter((b) => b.taskId === taskId)
      .reduce(
        (sum, b) =>
          sum +
          Math.round((b.endTime.getTime() - b.startTime.getTime()) / 60_000),
        0
      );
  const titleOf = (id: string) => tasks.find((t) => t.id === id)?.title ?? '';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            {formatDayRange(days[0].date, lastDay.date, timeZone)}
          </h1>
          <p className="mt-1 text-muted">
            Whatever doesn&apos;t fit one day moves to the next working day.
            Click anything to change it, or drag a task to another day (press
            and hold it first on a touch screen).
          </p>
        </div>
        <WorkingHours
          week={week}
          label="Change working hours and days off"
          triggerClassName={`${buttonSecondary} cursor-pointer`}
          trigger="Working hours"
        />
      </div>

      {lateTasks.map((task) => (
        <div
          key={task.id}
          role="status"
          className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          <p>
            <strong className="font-semibold">{task.title}</strong>{' '}
            {lateMessage(task)}
          </p>
        </div>
      ))}

      {changes.startedEarly.length > 0 && (
        <section
          aria-labelledby="deadline-changes"
          className="rounded-lg border border-line bg-surface px-4 py-3 text-sm"
        >
          <h2 id="deadline-changes" className="font-semibold">
            Planned around your deadlines
          </h2>
          <ul className="mt-1 flex flex-col gap-0.5 text-ink-2">
            {changes.startedEarly.map(({ taskId, firstDayIndex }) => {
              const deadline = tasks.find((t) => t.id === taskId)?.deadline;
              const due = deadline
                ? formatDue(deadline, now, timeZone).replace(/^Due /, '')
                : 'its deadline';
              // Due after this week: say how much of it has to happen now.
              const dueLater = !!deadline && deadline >= weekEnd;
              return (
                <li key={taskId}>
                  <strong className="font-medium text-ink">
                    {titleOf(taskId)}
                  </strong>{' '}
                  {dueLater
                    ? `gets ${formatMinutes(minutesThisWeek(taskId))} this week, starting ${dayName(firstDayIndex)}, so it's done by ${due}.`
                    : `starts ${dayName(firstDayIndex)}, so it's done by ${due}.`}
                </li>
              );
            })}
            {changes.movedLater.map(({ taskId, fromDayIndex, toDayIndex }) => (
              <li key={taskId}>
                To make room,{' '}
                <strong className="font-medium text-ink">
                  {titleOf(taskId)}
                </strong>{' '}
                {toDayIndex === null
                  ? `now finishes after this week instead of ${dayName(fromDayIndex)}.`
                  : `now finishes ${dayName(toDayIndex)} instead of ${dayName(fromDayIndex)}.`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {notThisWeek.length > 0 && (
        <div
          role="status"
          className="rounded-lg border border-warning-line bg-warning-bg px-4 py-3 text-sm text-warning-ink"
        >
          <strong className="font-semibold">
            Not enough time this week for:
          </strong>{' '}
          {notThisWeek.map((t) => t.title).join(', ')}. Extend your hours or
          free up time.
        </div>
      )}

      <QuickAdd today={toDateKey(now, timeZone)} />

      <WeekBoard
        days={days}
        loads={loads}
        blocks={plan.scheduledBlocks}
        tasks={tasks}
        events={commitments}
        lateTaskIds={plan.lateTaskIds}
        timeZone={timeZone}
      />
    </div>
  );
}
