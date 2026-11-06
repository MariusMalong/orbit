import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { raiseTaskPriority } from '@/app/actions/task';
import { QuickAdd } from '@/components/quick-add';
import { WeekBoard } from '@/components/week-board';
import { WorkingHours } from '@/components/working-hours';
import { buttonSecondary } from '@/components/ui-classes';
import { formatDayRange, formatDue } from '@/lib/format';
import { loadPlan } from '@/lib/planning/load-plan';
import type { SchedulableTask } from '@/lib/engine/scheduler';
import { raisingPriorityHelps } from '@/lib/engine/rescue';
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

  const { timeZone, now, tasks, commitments, days, week, plan, loads } =
    await loadPlan(session.user.id);

  const lastDay = days[days.length - 1];
  const lateTasks = tasks.filter((t) => plan.lateTaskIds.includes(t.id));
  const notThisWeek = tasks.filter(
    (t) =>
      plan.unscheduledTaskIds.includes(t.id) && !plan.lateTaskIds.includes(t.id)
  );

  // An overdue task is already planned first, so raising its priority can't
  // help. Otherwise the button is only offered when re-planning with the task
  // at high priority gets it done in time without making anything else late.
  const busy = commitments.map((c) => ({ start: c.start, end: c.end }));
  const isOverdue = (task: SchedulableTask) =>
    !!task.deadline && task.deadline <= now;
  const canRaise = (task: SchedulableTask) =>
    !isOverdue(task) && raisingPriorityHelps(task.id, tasks, busy, days);
  const lateMessage = (task: SchedulableTask) => {
    const due = task.deadline
      ? formatDue(task.deadline, now, timeZone).replace(/^Due /, '')
      : '';
    if (isOverdue(task)) {
      return `was due ${due}. It's planned as soon as possible.`;
    }
    if (canRaise(task)) {
      return `won't be done by ${due}. Making it high priority gets it done in time.`;
    }
    return task.priority >= 3
      ? `won't be done by ${due}, even at high priority. Free up time or change your working hours.`
      : `won't be done by ${due}, and raising its priority wouldn't fix that. Free up time or change your working hours.`;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            {formatDayRange(days[0].date, lastDay.date, timeZone)}
          </h1>
          <p className="mt-1 text-muted">
            Whatever doesn&apos;t fit one day moves to the next working day.
            Click anything to change it.
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
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          <p>
            <strong className="font-semibold">{task.title}</strong>{' '}
            {lateMessage(task)}
          </p>
          {canRaise(task) && (
            <form action={raiseTaskPriority}>
              <input type="hidden" name="taskId" value={task.id} />
              <button
                type="submit"
                className="min-h-10 cursor-pointer rounded-lg border border-danger/40 bg-surface px-3 font-semibold text-danger transition hover:bg-danger/5 focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
              >
                Make it high priority
              </button>
            </form>
          )}
        </div>
      ))}

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
