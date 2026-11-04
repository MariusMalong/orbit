import { ScheduleBlockResult, SchedulableTask } from '@/lib/engine/scheduler';
import { formatClock } from '@/lib/format';
import { panel } from '@/components/ui-classes';

interface TimelineCommitment {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

interface TimelineProps {
  scheduledBlocks: ScheduleBlockResult[];
  bumpedTaskIds: string[];
  tasks: SchedulableTask[];
  commitments: TimelineCommitment[];
  workDayStart: Date;
  workDayEnd: Date;
  headerAction?: React.ReactNode;
}

// Vertical scale of the calendar grid.
const HOUR_HEIGHT_PX = 64;
const PX_PER_MINUTE = HOUR_HEIGHT_PX / 60;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;

export function Timeline({
  scheduledBlocks,
  bumpedTaskIds,
  tasks,
  commitments,
  workDayStart,
  workDayEnd,
  headerAction,
}: TimelineProps) {
  // Quick lookup map to resolve task titles and priorities by ID
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const bumpedTasks = bumpedTaskIds.map((id) => taskMap.get(id)).filter(Boolean) as SchedulableTask[];

  // The grid snaps outward to whole hours so every hour line gets a label.
  const gridStart = new Date(workDayStart);
  gridStart.setMinutes(0, 0, 0);
  const gridEnd = new Date(workDayEnd);
  if (gridEnd.getMinutes() > 0) {
    gridEnd.setHours(gridEnd.getHours() + 1, 0, 0, 0);
  }
  const hourCount = Math.max(1, Math.round((gridEnd.getTime() - gridStart.getTime()) / MS_PER_HOUR));
  const hourMarks = Array.from({ length: hourCount + 1 }, (_, i) => new Date(gridStart.getTime() + i * MS_PER_HOUR));

  // Convert an absolute time into a pixel offset from the top of the grid.
  const offsetPx = (date: Date) => ((date.getTime() - gridStart.getTime()) / MS_PER_MINUTE) * PX_PER_MINUTE;

  // Only commitments that overlap today's grid are drawn, clipped to its edges.
  const visibleCommitments = commitments
    .filter((c) => c.end > gridStart && c.start < gridEnd)
    .map((c) => ({
      ...c,
      drawStart: c.start < gridStart ? gridStart : c.start,
      drawEnd: c.end > gridEnd ? gridEnd : c.end,
    }));

  return (
    <section aria-labelledby="plan-heading" className={`${panel} flex flex-col gap-5 md:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="plan-heading" className="font-display text-xl font-semibold">Today&apos;s plan</h2>
          <p className="mt-0.5 text-sm text-muted">Built from your priorities, around fixed commitments</p>
        </div>
        {headerAction}
      </div>

      {/* Spillover warning: tasks the engine could not fit inside the workday */}
      {bumpedTasks.length > 0 && (
        <div role="status" className="rounded-lg border border-warning-line bg-warning-bg p-4 text-warning-ink">
          <p className="text-sm font-semibold">
            {bumpedTasks.length === 1 ? '1 task' : `${bumpedTasks.length} tasks`} didn&apos;t fit today
          </p>
          <p className="mt-1 text-sm">Extend your hours or free up time to fit the rest in.</p>
          <ul className="mt-2 flex flex-col gap-0.5 text-sm">
            {bumpedTasks.map((task) => (
              <li key={task.id}>
                {task.title} · {task.durationEstimate} min
              </li>
            ))}
          </ul>
        </div>
      )}

      {scheduledBlocks.length === 0 && (
        <p className="text-sm text-muted">
          Nothing scheduled yet. Add a task and Orbit will fit it into your day.
        </p>
      )}

      {/* Calendar grid */}
      <div className="relative mb-2 mt-2" style={{ height: hourCount * HOUR_HEIGHT_PX }}>
        {hourMarks.map((mark) => (
          <div
            key={mark.getTime()}
            className="absolute inset-x-0 flex gap-3"
            style={{ top: offsetPx(mark) }}
          >
            <span className="-mt-2 w-12 shrink-0 text-right text-xs tabular-nums text-muted">
              {formatClock(mark)}
            </span>
            <div className="flex-1 border-t border-line-soft" />
          </div>
        ))}

        {visibleCommitments.map((c) => (
          <div
            key={c.id}
            className="absolute left-16 right-1 overflow-hidden rounded-lg border border-dashed border-line bg-subtle px-4 py-2"
            style={{ top: offsetPx(c.drawStart), height: offsetPx(c.drawEnd) - offsetPx(c.drawStart) }}
          >
            <p className="truncate text-sm font-medium text-ink-2">{c.title}</p>
            <p className="text-xs text-muted">
              {formatClock(c.start)} – {formatClock(c.end)} · Fixed
            </p>
          </div>
        ))}

        {scheduledBlocks.map((block, index) => {
          const task = taskMap.get(block.taskId);
          if (!task) return null;

          const top = offsetPx(block.startTime);
          const height = offsetPx(block.endTime) - top;
          const minutes = Math.round((block.endTime.getTime() - block.startTime.getTime()) / MS_PER_MINUTE);
          const isCompact = height < 44;

          return (
            <div
              key={`${block.taskId}-${index}`}
              className={`absolute left-16 right-1 flex items-start justify-between gap-3 overflow-hidden rounded-lg bg-accent-tint px-4 ${isCompact ? 'py-1' : 'py-2.5'}`}
              style={{ top, height }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{task.title}</p>
                {!isCompact && (
                  <p className="text-xs text-ink-2">
                    {formatClock(block.startTime)} – {formatClock(block.endTime)} · {minutes} min
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-medium">
                P{task.priority}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
