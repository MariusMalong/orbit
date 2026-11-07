import {
  calculateFreeWindows,
  ScheduleBlockResult,
  SchedulableTask,
} from '@/lib/engine/scheduler';
import { formatClock, PRIORITY_LABELS } from '@/lib/format';
import { getZonedParts } from '@/lib/time/zoned';
import { addMinutesToClock, toDateKey } from '@/lib/time/clock';
import { panel } from '@/components/ui-classes';
import { EventMenu, MenuHeading, TaskMenu } from '@/components/item-menus';
import { AddEventButton } from '@/components/quick-add';
import type { EventOccurrence } from '@/lib/planning/recurrence';
import { RepeatIcon } from '@/components/repeat-icon';
import { TimelineDraggable } from '@/components/draggable-task';

interface TimelineProps {
  scheduledBlocks: ScheduleBlockResult[];
  tasks: SchedulableTask[];
  commitments: EventOccurrence[];
  workDayStart: Date;
  workDayEnd: Date;
  isDayOff: boolean; // Nothing is planned; events still show
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
// Free time shorter than this isn't offered as a slot for a new event.
const MIN_FREE_SLOT_MINUTES = 15;

export function Timeline({
  scheduledBlocks,
  tasks,
  commitments,
  workDayStart,
  workDayEnd,
  isDayOff,
  now,
  planStart,
  timeZone,
  headerAction,
}: TimelineProps) {
  // Quick lookup map to resolve task titles and priorities by ID
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

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

  // Free time from now on that nothing is planned in, offered for new events.
  const slotsFrom = planStart > gridStart ? planStart : gridStart;
  const freeSlots =
    slotsFrom < gridEnd
      ? calculateFreeWindows(slotsFrom, gridEnd, [
          ...commitments,
          ...scheduledBlocks.map((b) => ({
            start: b.startTime,
            end: b.endTime,
          })),
        ]).filter(
          (w) =>
            (w.end.getTime() - w.start.getTime()) / MS_PER_MINUTE >=
            MIN_FREE_SLOT_MINUTES
        )
      : [];

  // An hour-long event starting at `start`, in the visitor's timezone.
  const draftAt = (start: Date) => {
    const clock = formatClock(start, timeZone);
    return {
      date: toDateKey(start, timeZone),
      start: clock,
      end: addMinutesToClock(clock, 60),
    };
  };

  return (
    <section
      aria-labelledby="plan-heading"
      className={`${panel} flex flex-col gap-5 md:p-6`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="plan-heading" className="font-display text-xl font-semibold">
            Today&apos;s plan
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {planStart > workDayStart && !dayIsOver && !isDayOff
              ? `Planned from ${formatClock(planStart, timeZone)}. `
              : ''}
            Click an hour or a free slot to add an event, or a block to change
            it. Drag a task to move it.
          </p>
        </div>
        <div className="shrink-0">{headerAction}</div>
      </div>

      {isDayOff ? (
        <p className="rounded-lg bg-subtle px-4 py-3 text-sm text-ink-2">
          Today is a day off, so no tasks are planned. Events still show here,
          and you can add more.
        </p>
      ) : (
        scheduledBlocks.length === 0 &&
        !dayIsOver && (
          <p className="text-sm text-muted">
            Nothing planned for the rest of today. Add a task above and Orbit
            will fit it in.
          </p>
        )
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
            {isUnderNowLabel(mark) ? (
              <span className="w-12 shrink-0" />
            ) : mark > now && mark < gridEnd ? (
              // Upcoming hours double as "add an event here" buttons.
              <AddEventButton
                draft={draftAt(mark)}
                label={`Add event at ${formatClock(mark, timeZone)}`}
                className="group -mt-2.5 h-5 w-12 shrink-0 cursor-pointer rounded text-right text-xs text-muted tabular-nums hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
              >
                <span className="group-hover:hidden">
                  {formatClock(mark, timeZone)}
                </span>
                <span className="hidden font-semibold group-hover:inline">
                  + {formatClock(mark, timeZone)}
                </span>
              </AddEventButton>
            ) : (
              <span className="-mt-2 w-12 shrink-0 text-right text-xs text-muted tabular-nums">
                {formatClock(mark, timeZone)}
              </span>
            )}
            <div className="flex-1 border-t border-line-soft" />
          </div>
        ))}

        {freeSlots.map((slot) => {
          const top = offsetPx(slot.start) + 2;
          const height = offsetPx(slot.end) - offsetPx(slot.start) - 4;
          const clock = formatClock(slot.start, timeZone);
          return (
            <AddEventButton
              key={slot.start.getTime()}
              draft={draftAt(slot.start)}
              className={`absolute right-1 left-16 flex cursor-pointer items-center rounded-lg border-[1.5px] border-dashed border-line px-4 text-left text-xs text-muted transition hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none ${height < 28 ? 'py-0' : 'py-2'}`}
              style={{ top, height }}
            >
              + Add event at {clock}
            </AddEventButton>
          );
        })}

        {visibleCommitments.map((c) => {
          const time = `${formatClock(c.start, timeZone)} – ${formatClock(c.end, timeZone)}`;
          const height = offsetPx(c.drawEnd) - offsetPx(c.drawStart);
          return (
            <EventMenu
              key={c.key}
              commitment={{
                id: c.id,
                title: c.title,
                startTime: c.start,
                endTime: c.end,
                repeatsWeekly: c.repeatsWeekly,
              }}
              heading={
                <MenuHeading
                  title={c.title}
                  detail={`${time} · ${c.repeatsWeekly ? 'Weekly' : 'Fixed'}`}
                />
              }
              className="absolute right-1 left-16"
              style={{ top: offsetPx(c.drawStart), height }}
              triggerClassName={`block h-full w-full cursor-pointer overflow-hidden rounded-lg border border-dashed border-line bg-subtle px-4 text-left transition hover:border-muted focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none ${height < 44 ? 'py-1' : 'py-2'}`}
              trigger={
                <>
                  <span className="block truncate text-sm font-medium text-ink-2">
                    {c.title}
                    {c.repeatsWeekly && <RepeatIcon />}
                  </span>
                  {height >= 44 ? (
                    <span className="block text-xs text-muted">
                      {time} · {c.repeatsWeekly ? 'Weekly' : 'Fixed'}
                    </span>
                  ) : (
                    // Too short to show the time, so screen readers still get it.
                    <span className="sr-only">
                      , {time} · {c.repeatsWeekly ? 'Weekly' : 'Fixed'}
                    </span>
                  )}
                  <span className="sr-only">. Edit or delete</span>
                </>
              }
            />
          );
        })}

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

          const time = `${formatClock(block.startTime, timeZone)} – ${formatClock(block.endTime, timeZone)}`;
          const priority = PRIORITY_LABELS[task.priority] ?? '';

          const placed = task.plannedStart ? ' · Your time' : '';

          return (
            <TimelineDraggable
              key={`${block.taskId}-${index}`}
              taskId={task.id}
              start={block.startTime}
              earliest={planStart}
              latest={gridEnd}
              pxPerMinute={PX_PER_MINUTE}
              timeZone={timeZone}
              className="absolute right-1 left-16"
              style={{ top, height }}
            >
              <TaskMenu
                task={{ ...task, deadline: task.deadline ?? null }}
                heading={
                  <MenuHeading
                    title={task.title}
                    detail={`${time} · ${minutes} min${placed}`}
                  />
                }
                className="relative h-full"
                triggerClassName={`flex h-full w-full cursor-pointer items-start justify-between gap-3 overflow-hidden rounded-lg bg-accent-tint px-4 text-left shadow-[inset_3px_0_0_var(--color-accent-edge)] transition hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none ${isCompact ? 'py-1' : 'py-2.5'}`}
                trigger={
                  <>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {task.title}
                      </span>
                      {isCompact ? (
                        <span className="sr-only">
                          , {time} · {minutes} min{placed}
                        </span>
                      ) : (
                        <span className="block text-xs text-ink-2">
                          {time} · {minutes} min{placed}
                        </span>
                      )}
                    </span>
                    {priority && !isCompact && (
                      <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-medium">
                        {priority}
                      </span>
                    )}
                    <span className="sr-only">
                      . Edit, mark as done or delete
                    </span>
                  </>
                }
              />
            </TimelineDraggable>
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
