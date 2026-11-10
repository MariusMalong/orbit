import { completeTask } from '@/app/actions/task';
import { EmptyState } from '@/components/empty-state';
import { projectDot, type ProjectInfo } from '@/lib/projects';
import { FocusTimer } from '@/components/focus-timer';
import { buttonSecondary, panel } from '@/components/ui-classes';
import { formatClock, formatDue, PRIORITY_LABELS } from '@/lib/format';
import type { SchedulableTask } from '@/lib/engine/scheduler';

export type NowItem =
  | { kind: 'task'; start: Date; end: Date; task: SchedulableTask }
  | { kind: 'event'; start: Date; end: Date; title: string };

interface NowCardProps {
  items: NowItem[]; // The rest of today, in time order
  lateTaskIds: Set<string>;
  isDayOff: boolean;
  now: Date;
  timeZone: string;
  projectOf?: Record<string, ProjectInfo>; // Each task's project, by task id
}

const NEXT_COUNT = 4;

const minutesBetween = (start: Date, end: Date) =>
  Math.round((end.getTime() - start.getTime()) / 60_000);

/**
 * The phone view of today: what to do now, with a big Start focus button,
 * and the next few things after it. The full timeline is further down.
 */
export function NowCard({
  items,
  lateTaskIds,
  isDayOff,
  now,
  timeZone,
  projectOf = {},
}: NowCardProps) {
  // A task's bar is in its project's colour, as on the timeline.
  const barColor = (item: NowItem) =>
    item.kind !== 'task'
      ? 'bg-line'
      : projectOf[item.task.id]
        ? projectDot(projectOf[item.task.id].color)
        : 'bg-accent';
  if (items.length === 0) {
    return (
      <section aria-label="Now" className={panel}>
        {isDayOff ? (
          <EmptyState picture="rest" title="Today is a day off">
            No tasks are planned today. Anything new is planned for your next
            working day.
          </EmptyState>
        ) : (
          <EmptyState
            picture="orbit"
            title="Nothing else planned today"
            addTask
          >
            Add a task and Orbit will fit it in, or see what comes next on the
            Week page.
          </EmptyState>
        )}
      </section>
    );
  }

  const [current, ...rest] = items;
  const next = rest.slice(0, NEXT_COUNT);
  const more = rest.length - next.length;
  const hasStarted = current.start.getTime() <= now.getTime() + 5 * 60_000;
  const isOverdue =
    current.kind === 'task' &&
    !!current.task.deadline &&
    current.task.deadline <= now;
  const time = `${formatClock(current.start, timeZone)}–${formatClock(current.end, timeZone)}`;

  return (
    <div className="flex flex-col gap-3">
      <section
        aria-labelledby="now-heading"
        className={`${panel} flex flex-col gap-4`}
      >
        <p
          id="now-heading"
          className="flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-2 uppercase"
        >
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
          {hasStarted
            ? 'Now'
            : `Next at ${formatClock(current.start, timeZone)}`}{' '}
          · {time}
        </p>

        {current.kind === 'task' ? (
          <>
            <div>
              <h2 className="font-display text-2xl leading-tight font-semibold break-words">
                {current.task.title}
              </h2>
              <p className="mt-1.5 text-sm text-muted">
                {minutesBetween(current.start, current.end)} min ·{' '}
                {PRIORITY_LABELS[current.task.priority]} priority
                {current.task.deadline &&
                  !isOverdue &&
                  ` · ${formatDue(current.task.deadline, now, timeZone)}`}
              </p>
              {(isOverdue || lateTaskIds.has(current.task.id)) && (
                <p className="mt-0.5 text-sm font-medium text-danger">
                  {isOverdue && current.task.deadline
                    ? `Overdue: ${formatDue(current.task.deadline, now, timeZone).replace(/^Due/, 'was due')}`
                    : "Won't be done by its deadline"}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <FocusTimer
                  taskId={current.task.id}
                  taskTitle={current.task.title}
                  size="large"
                />
              </div>
              <form action={completeTask}>
                <input type="hidden" name="taskId" value={current.task.id} />
                <button
                  type="submit"
                  className={`${buttonSecondary} min-h-13 cursor-pointer px-5`}
                >
                  Done
                </button>
              </form>
            </div>
          </>
        ) : (
          <div>
            <h2 className="font-display text-2xl leading-tight font-semibold break-words">
              {current.title}
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              Fixed event · {minutesBetween(current.start, current.end)} min
            </p>
          </div>
        )}
      </section>

      {next.length > 0 && (
        <section aria-labelledby="next-heading" className={`${panel} py-4`}>
          <h2
            id="next-heading"
            className="font-display text-base font-semibold"
          >
            After that
          </h2>
          <ol className="mt-1">
            {next.map((item) => (
              <li
                key={`${item.kind}-${item.start.getTime()}`}
                className="flex gap-3 border-t border-line-soft py-2.5 first:border-t-0"
              >
                <span className="w-11 shrink-0 pt-0.5 text-sm text-muted tabular-nums">
                  {formatClock(item.start, timeZone)}
                </span>
                <span
                  aria-hidden="true"
                  className={`w-1 shrink-0 rounded-full ${barColor(item)}`}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block break-words ${item.kind === 'task' ? 'font-semibold' : 'font-medium text-ink-2'}`}
                  >
                    {item.kind === 'task' ? item.task.title : item.title}
                  </span>
                  <span className="block text-xs text-muted">
                    {minutesBetween(item.start, item.end)} min
                    {item.kind === 'event' ? ' · Fixed' : ''}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          {more > 0 && (
            <p className="mt-1 text-sm text-muted">
              {more === 1 ? '1 more thing' : `${more} more things`} today, on
              the timeline below.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
