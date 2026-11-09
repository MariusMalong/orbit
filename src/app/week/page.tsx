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
import { lateReason } from '@/lib/late';
import { ProjectsProvider } from '@/components/projects-context';
import { ProjectsDialog } from '@/components/projects-dialog';
import { plannedByProject, projectDot } from '@/lib/projects';
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
    projects,
    projectOf,
  } = await loadPlan(session.user.id);
  const byProject = plannedByProject(plan.scheduledBlocks, projects, projectOf);

  const lastDay = days[days.length - 1];
  const lateTasks = tasks.filter((t) => plan.lateTaskIds.includes(t.id));
  const notThisWeek = tasks.filter(
    (t) =>
      plan.unscheduledTaskIds.includes(t.id) && !plan.lateTaskIds.includes(t.id)
  );

  const lateMessage = (task: SchedulableTask) => {
    const { overdue, text } = lateReason(task.deadline, now, timeZone);
    return overdue
      ? text
      : `${text} Free up time before then or change your working hours.`;
  };

  // The one-line summary of everything that needs a look this week.
  const summaryParts = [
    lateTasks.length > 0 && {
      text: `${lateTasks.length} late`,
      className: 'text-danger',
    },
    notThisWeek.length > 0 && {
      text: `${notThisWeek.length} ${notThisWeek.length === 1 ? "doesn't" : "don't"} fit this week`,
      className: 'text-warning-ink',
    },
    changes.startedEarly.length + changes.movedLater.length > 0 && {
      text: `${changes.startedEarly.length + changes.movedLater.length} ${
        changes.startedEarly.length + changes.movedLater.length === 1
          ? 'change'
          : 'changes'
      } for deadlines`,
      className: 'text-ink',
    },
  ].filter((part): part is { text: string; className: string } => !!part);
  const noticeCount = summaryParts.length;

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
    <ProjectsProvider projects={projects}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              {formatDayRange(days[0].date, lastDay.date, timeZone)}
            </h1>
            <p className="mt-1 text-muted">
              Work that doesn&apos;t fit moves to the next working day.{' '}
              <span className="pointer-coarse:hidden">
                Drag a task to another day to move it.
              </span>
              <span className="hidden pointer-coarse:inline">
                Press and hold a task to move it to another day.
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <ProjectsDialog
              triggerClassName={`${buttonSecondary} cursor-pointer`}
            />
            <WorkingHours
              week={week}
              label="Change working hours and days off"
              triggerClassName={`${buttonSecondary} cursor-pointer`}
              trigger="Working hours"
            />
          </div>
        </div>

        {noticeCount > 0 && (
          // One line that says what needs a look, so the board stays near the
          // top; the details open from it.
          <details
            className={`group rounded-lg border px-4 py-2.5 text-sm ${
              lateTasks.length > 0
                ? 'border-danger/40 bg-danger/5'
                : notThisWeek.length > 0
                  ? 'border-warning-line bg-warning-bg'
                  : 'border-line bg-surface'
            }`}
          >
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 rounded focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
                className="shrink-0 text-muted transition group-open:rotate-90"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
              {summaryParts.map((part) => (
                <span
                  key={part.text}
                  className={`font-medium ${part.className}`}
                >
                  {part.text}
                </span>
              ))}
              <span className="text-muted group-open:hidden">Show details</span>
              <span className="hidden text-muted group-open:inline">
                Hide details
              </span>
            </summary>
            <div className="mt-3 flex flex-col gap-3 border-t border-line-soft pt-3">
              {lateTasks.map((task) => (
                <div key={task.id} role="status" className="text-danger">
                  <p>
                    <strong className="font-semibold">{task.title}</strong>{' '}
                    {lateMessage(task)}
                  </p>
                </div>
              ))}

              {changes.startedEarly.length > 0 && (
                <section aria-labelledby="deadline-changes">
                  <h3 id="deadline-changes" className="font-semibold">
                    Planned around your deadlines
                  </h3>
                  <ul className="mt-1 flex flex-col gap-0.5 text-ink-2">
                    {changes.startedEarly.map(({ taskId, firstDayIndex }) => {
                      const deadline = tasks.find(
                        (t) => t.id === taskId
                      )?.deadline;
                      const due = deadline
                        ? formatDue(deadline, now, timeZone).replace(
                            /^Due /,
                            ''
                          )
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
                    {changes.movedLater.map(
                      ({ taskId, fromDayIndex, toDayIndex }) => (
                        <li key={taskId}>
                          To make room,{' '}
                          <strong className="font-medium text-ink">
                            {titleOf(taskId)}
                          </strong>{' '}
                          {toDayIndex === null
                            ? `now finishes after this week instead of ${dayName(fromDayIndex)}.`
                            : `now finishes ${dayName(toDayIndex)} instead of ${dayName(fromDayIndex)}.`}
                        </li>
                      )
                    )}
                  </ul>
                </section>
              )}

              {notThisWeek.length > 0 && (
                <div role="status" className="text-warning-ink">
                  <strong className="font-semibold">
                    Not enough time this week for:
                  </strong>{' '}
                  {notThisWeek.map((t) => t.title).join(', ')}. Extend your
                  hours or free up time.
                </div>
              )}
            </div>
          </details>
        )}

        <QuickAdd today={toDateKey(now, timeZone)} />

        {projects.length > 0 && byProject.length > 0 && (
          <section
            aria-labelledby="by-project"
            className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
          >
            <h2 id="by-project" className="font-semibold">
              Planned this week
            </h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-ink-2">
              {byProject.map(({ project, minutes }) => (
                <li
                  key={project?.id ?? 'none'}
                  className="inline-flex items-center gap-1.5"
                >
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${project ? projectDot(project.color) : 'border border-muted'}`}
                  />
                  {project?.name ?? 'No project'}{' '}
                  <span className="text-muted tabular-nums">
                    {formatMinutes(minutes)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <WeekBoard
          days={days}
          loads={loads}
          blocks={plan.scheduledBlocks}
          tasks={tasks}
          events={commitments}
          lateTaskIds={plan.lateTaskIds}
          timeZone={timeZone}
          projectOf={projectOf}
          now={now}
        />
      </div>
    </ProjectsProvider>
  );
}
