import { ScheduleBlockResult, SchedulableTask } from '@/lib/engine/scheduler';
import { formatClock, formatDue, formatShortDay } from '@/lib/format';
import { getZonedParts } from '@/lib/time/zoned';
import { panel } from '@/components/ui-classes';

interface TimelineCommitment {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

interface TimelineProps {
  scheduledBlocks: ScheduleBlockResult[];
  // Tasks with time left after today, and when they continue (null: not this week)
  leftovers: {
    task: SchedulableTask;
    minutesLeft: number;
    continuesOn: Date | null;
  }[];
  lateTaskIds: string[];
  tasks: SchedulableTask[];
  commitments: TimelineCommitment[];
  workDayStart: Date;
  workDayEnd: Date;
  now: Date;
  planStart: Date; // Where the engine started planning: now, or the start of the workday
  timeZone: string; // Visitor's timezone, for hour labels and times
  headerAction?: React.ReactNode;
}

// Vertical scale of the calendar grid.
const HOUR_HEIGHT_PX = 64;
const PX_PER_MINUTE = HOUR_HEIGHT_PX / 60;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;

export function Timeline({
  scheduledBlocks,
  leftovers,
  lateTaskIds,
  tasks,
  commitments,
  workDayStart,
  workDayEnd,
  now,
  planStart,
  timeZone,
  headerAction,
}: TimelineProps) {
  // Quick lookup map to resolve task titles and priorities by ID
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const allContinueThisWeek = leftovers.every((l) => l.continuesOn);
  const lateTasks = lateTaskIds
    .map((id) => taskMap.get(id))
    .filter(Boolean) as SchedulableTask[];

  // The grid snaps outward to whole hours (in the visitor's timezone, which
  // may be offset by half an hour) so every hour line gets a label.
  const startMinute = getZonedParts(workDayStart, timeZone).minute;
  const gridStart = new Date(
    workDayStart.getTime() - startMinute * MS_PER_MINUTE
  );
  const endMinute = getZonedParts(workDayEnd, timeZone).minute;
  const gridEnd = new Date(
    workDayEnd.getTime() + (endMinute > 0 ? 60 - endMinute : 0) * MS_PER_MINUTE
  );
  const hourCount = Math.max(
    1,
    Math.round((gridEnd.getTime() - gridStart.getTime()) / MS_PER_HOUR)
  );
  const hourMarks = Array.from(
    { length: hourCount + 1 },
    (_, i) => new Date(gridStart.getTime() + i * MS_PER_HOUR)
  );

  // Convert an absolute time into a pixel offset from the top of the grid.
  const offsetPx = (date: Date) =>
    ((date.getTime() - gridStart.getTime()) / MS_PER_MINUTE) * PX_PER_MINUTE;

  const dayIsOver = planStart >= workDayEnd;
  const showNowLine = now >= gridStart && now <= gridEnd;
  // Hide an hour label the "Now" label would sit on top of.
  const NOW_LABEL_CLEARANCE_PX = 14;
  const isUnderNowLabel = (mark: Date) =>
    showNowLine &&
    Math.abs(offsetPx(mark) - offsetPx(now)) < NOW_LABEL_CLEARANCE_PX;

  // Only commitments that overlap today's grid are drawn, clipped to its edges.
  const visibleCommitments = commitments
    .filter((c) => c.end > gridStart && c.start < gridEnd)
    .map((c) => ({
      ...c,
      drawStart: c.start < gridStart ? gridStart : c.start,
      drawEnd: c.end > gridEnd ? gridEnd : c.end,
    }));

  return (
    <section
      aria-labelledby="plan-heading"
      className={`${panel} flex flex-col gap-5 md:p-6`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="plan-heading" className="font-display text-xl font-semibold">
            Today&apos;s plan
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {planStart > workDayStart && !dayIsOver
              ? `Planned from ${formatClock(planStart, timeZone)}, around fixed commitments`
              : 'Built from your priorities, around fixed commitments'}
          </p>
        </div>
        {headerAction}
      </div>

      {/* Deadline warning: tasks that won't be finished by their deadline */}
      {lateTasks.length > 0 && (
        <div
          role="status"
          className="rounded-lg border border-danger/40 bg-danger/5 p-4 text-danger"
        >
          <p className="text-sm font-semibold">
            {lateTasks.length === 1 ? '1 task' : `${lateTasks.length} tasks`}{' '}
            won&apos;t be done by the deadline
          </p>
          <ul className="mt-2 flex flex-col gap-0.5 text-sm">
            {lateTasks.map((task) => (
              <li key={task.id}>
                {task.title}
                {task.deadline &&
                  ` · ${formatDue(task.deadline, now, timeZone).replace(/^Due/, 'due')}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Spillover warning: tasks the engine could not fit inside the workday */}
      {leftovers.length > 0 && (
        <div
          role="status"
          className="rounded-lg border border-warning-line bg-warning-bg p-4 text-warning-ink"
        >
          <p className="text-sm font-semibold">
            {leftovers.length === 1 ? '1 task' : `${leftovers.length} tasks`}{' '}
            didn&apos;t fit today
          </p>
          <p className="mt-1 text-sm">
            {dayIsOver
              ? "Today's working hours are over, so the rest is planned for the coming days."
              : allContinueThisWeek
                ? 'The rest is planned for the coming days, below.'
                : "Some of it doesn't fit this week either. Extend your hours or free up time."}
          </p>
          <ul className="mt-2 flex flex-col gap-0.5 text-sm">
            {leftovers.map(({ task, minutesLeft, continuesOn }) => (
              <li key={task.id}>
                {task.title} · {minutesLeft} min ·{' '}
                {continuesOn
                  ? `continues ${formatShortDay(continuesOn, timeZone)}`
                  : "doesn't fit this week"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {scheduledBlocks.length === 0 && leftovers.length === 0 && (
        <p className="text-sm text-muted">
          Nothing scheduled yet. Add a task and Orbit will fit it into your day.
        </p>
      )}

      {/* Calendar grid */}
      <div
        className="relative mt-2 mb-2"
        style={{ height: hourCount * HOUR_HEIGHT_PX }}
      >
        {hourMarks.map((mark) => (
          <div
            key={mark.getTime()}
            className="absolute inset-x-0 flex gap-3"
            style={{ top: offsetPx(mark) }}
          >
            <span className="-mt-2 w-12 shrink-0 text-right text-xs text-muted tabular-nums">
              {isUnderNowLabel(mark) ? '' : formatClock(mark, timeZone)}
            </span>
            <div className="flex-1 border-t border-line-soft" />
          </div>
        ))}

        {visibleCommitments.map((c) => (
          <div
            key={c.id}
            className="absolute right-1 left-16 overflow-hidden rounded-lg border border-dashed border-line bg-subtle px-4 py-2"
            style={{
              top: offsetPx(c.drawStart),
              height: offsetPx(c.drawEnd) - offsetPx(c.drawStart),
            }}
          >
            <p className="truncate text-sm font-medium text-ink-2">{c.title}</p>
            <p className="text-xs text-muted">
              {formatClock(c.start, timeZone)} – {formatClock(c.end, timeZone)}{' '}
              · Fixed
            </p>
          </div>
        ))}

        {scheduledBlocks.map((block, index) => {
          const task = taskMap.get(block.taskId);
          if (!task) return null;

          const top = offsetPx(block.startTime);
          const height = offsetPx(block.endTime) - top;
          const minutes = Math.round(
            (block.endTime.getTime() - block.startTime.getTime()) /
              MS_PER_MINUTE
          );
          const isCompact = height < 44;

          return (
            <div
              key={`${block.taskId}-${index}`}
              className={`absolute right-1 left-16 flex items-start justify-between gap-3 overflow-hidden rounded-lg bg-accent-tint px-4 ${isCompact ? 'py-1' : 'py-2.5'}`}
              style={{ top, height }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{task.title}</p>
                {!isCompact && (
                  <p className="text-xs text-ink-2">
                    {formatClock(block.startTime, timeZone)} –{' '}
                    {formatClock(block.endTime, timeZone)} · {minutes} min
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-medium">
                P{task.priority}
              </span>
            </div>
          );
        })}

        {showNowLine && (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 flex items-center gap-3"
            style={{ top: offsetPx(now) }}
            aria-hidden="true"
          >
            <span className="-mt-px w-12 shrink-0 text-right text-xs font-semibold text-ink tabular-nums">
              Now
            </span>
            <div className="relative h-0.5 flex-1 bg-accent">
              <span className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-accent" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
