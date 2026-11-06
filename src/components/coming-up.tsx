import type { DayBlock } from '@/lib/engine/multi-day';
import type { SchedulableTask } from '@/lib/engine/scheduler';
import type { PlanningDayInfo } from '@/lib/planning/days';
import { formatClock, formatShortDay, PRIORITY_LABELS } from '@/lib/format';
import { panel } from '@/components/ui-classes';
import { EventMenu, MenuHeading, TaskMenu } from '@/components/item-menus';
import type { EventOccurrence } from '@/lib/planning/recurrence';
import { RepeatIcon } from '@/components/repeat-icon';

interface ComingUpProps {
  days: PlanningDayInfo[]; // The days after today
  blocks: DayBlock[]; // Blocks on those days; dayIndex counts from today (0)
  tasks: SchedulableTask[];
  events: EventOccurrence[]; // Events that start after today, in time order
  lateTaskIds: string[];
  timeZone: string;
}

type Item =
  | { kind: 'task'; start: Date; end: Date; task: SchedulableTask }
  | { kind: 'event'; start: Date; end: Date; event: EventOccurrence };

const rowClass =
  'flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg px-3 py-2 text-left text-sm transition ' +
  'focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none';

/**
 * The days after today: work the planner has carried over, and upcoming
 * events. Events further out than the planning week are listed under "Later".
 * Every row opens the same menu as its block on the timeline.
 */
export function ComingUp({
  days,
  blocks,
  tasks,
  events,
  lateTaskIds,
  timeZone,
}: ComingUpProps) {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const late = new Set(lateTaskIds);

  const toItem = (event: EventOccurrence): Item => ({
    kind: 'event',
    start: event.start,
    end: event.end,
    event,
  });

  const groups = days.map((day, i) => {
    const items: Item[] = [
      ...blocks.flatMap((b): Item[] => {
        const task = taskMap.get(b.taskId);
        return b.dayIndex === i + 1 && task
          ? [{ kind: 'task', start: b.startTime, end: b.endTime, task }]
          : [];
      }),
      ...events
        .filter((e) => e.start >= day.date && e.start < day.urgentUntil)
        .map(toItem),
    ].sort((a, b) => a.start.getTime() - b.start.getTime());

    return {
      key: String(day.date.getTime()),
      label: i === 0 ? 'Tomorrow' : formatShortDay(day.date, timeZone),
      hours: day.isDayOff
        ? 'Day off'
        : `${day.hours.startTime}–${day.hours.endTime}`,
      items,
    };
  });

  const lastDay = days.at(-1);
  const later = lastDay
    ? events.filter((e) => e.start >= lastDay.urgentUntil).map(toItem)
    : [];
  if (later.length > 0) {
    groups.push({ key: 'later', label: 'Later', hours: '', items: later });
  }

  const shown = groups.filter((g) => g.items.length > 0);
  if (shown.length === 0) return null;

  return (
    <section
      aria-labelledby="coming-up-heading"
      className={`${panel} mt-5 flex flex-col gap-4 md:p-6`}
    >
      <div>
        <h2
          id="coming-up-heading"
          className="font-display text-xl font-semibold"
        >
          Coming up
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          Work carried over from today, and your upcoming events
        </p>
      </div>

      <ol className="flex flex-col gap-4">
        {shown.map((group) => (
          <li key={group.key}>
            <h3 className="flex items-baseline gap-2 text-sm font-semibold">
              {group.label}
              {group.hours && (
                <span className="font-normal text-muted tabular-nums">
                  {group.hours}
                </span>
              )}
            </h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {group.items.map((item) => {
                const time =
                  group.key === 'later'
                    ? `${formatShortDay(item.start, timeZone)}, ${formatClock(item.start, timeZone)}`
                    : `${formatClock(item.start, timeZone)}–${formatClock(item.end, timeZone)}`;
                // On phones the time gets its own line so the title has room
                const timeLabel = (
                  <span className="w-full text-xs text-ink-2 tabular-nums sm:w-28 sm:shrink-0 sm:text-sm">
                    {time}
                  </span>
                );

                if (item.kind === 'event') {
                  const { event } = item;
                  return (
                    <li key={`event-${event.key}`}>
                      <EventMenu
                        commitment={{
                          id: event.id,
                          title: event.title,
                          startTime: event.start,
                          endTime: event.end,
                          repeatsWeekly: event.repeatsWeekly,
                        }}
                        label={`${event.title}, ${time}${event.repeatsWeekly ? ', every week' : ''}. Edit or delete`}
                        heading={
                          <MenuHeading
                            title={event.title}
                            detail={`${formatShortDay(event.start, timeZone)}, ${formatClock(event.start, timeZone)}–${formatClock(event.end, timeZone)}`}
                          />
                        }
                        panelClassName="left-0"
                        triggerClassName={`${rowClass} border border-dashed border-line bg-subtle hover:border-muted`}
                        trigger={
                          <>
                            {timeLabel}
                            <span className="min-w-0 flex-1 truncate font-medium text-ink-2">
                              {event.title}
                              {event.repeatsWeekly && <RepeatIcon />}
                            </span>
                            <span className="shrink-0 text-xs text-muted">
                              {event.repeatsWeekly ? 'Weekly' : 'Fixed'}
                            </span>
                          </>
                        }
                      />
                    </li>
                  );
                }

                const { task } = item;
                return (
                  <li key={`task-${task.id}-${item.start.getTime()}`}>
                    <TaskMenu
                      task={{ ...task, deadline: task.deadline ?? null }}
                      label={`${task.title}, ${time}. Edit, mark as done or delete`}
                      heading={
                        <MenuHeading
                          title={task.title}
                          detail={`${formatShortDay(item.start, timeZone)}, ${time}`}
                        />
                      }
                      panelClassName="left-0"
                      triggerClassName={`${rowClass} bg-accent-tint shadow-[inset_3px_0_0_var(--color-accent-edge)] hover:brightness-[0.97]`}
                      trigger={
                        <>
                          {timeLabel}
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {task.title}
                          </span>
                          {late.has(task.id) && (
                            <span className="shrink-0 text-xs font-medium text-danger">
                              Late
                            </span>
                          )}
                          <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-medium">
                            {PRIORITY_LABELS[task.priority] ?? ''}
                          </span>
                        </>
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
