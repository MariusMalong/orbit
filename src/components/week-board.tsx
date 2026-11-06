import type { DayBlock } from '@/lib/engine/multi-day';
import type { SchedulableTask } from '@/lib/engine/scheduler';
import type { PlanningDayInfo } from '@/lib/planning/days';
import type { DayLoad } from '@/lib/planning/load';
import { formatClock, formatMinutes, formatShortDay } from '@/lib/format';
import { EventMenu, MenuHeading, TaskMenu } from '@/components/item-menus';
import type { EventOccurrence } from '@/lib/planning/recurrence';
import { RepeatIcon } from '@/components/repeat-icon';

interface WeekBoardProps {
  days: PlanningDayInfo[]; // Today first
  loads: DayLoad[]; // One per day, same order
  blocks: DayBlock[]; // Planned work on every day
  tasks: SchedulableTask[];
  events: EventOccurrence[];
  lateTaskIds: string[];
  timeZone: string;
}

type Item =
  | { kind: 'task'; start: Date; end: Date; task: SchedulableTask }
  | { kind: 'event'; start: Date; end: Date; event: EventOccurrence };

const itemClass =
  'block w-full cursor-pointer rounded-lg px-2.5 py-1.5 text-left transition ' +
  'focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none';

/**
 * The next 7 days side by side (stacked on phones): each day's hours, how
 * full it is, and its planned work and events. Every item opens the same
 * menu as on the Today page.
 */
export function WeekBoard({
  days,
  loads,
  blocks,
  tasks,
  events,
  lateTaskIds,
  timeZone,
}: WeekBoardProps) {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const late = new Set(lateTaskIds);

  return (
    <ol className="flex flex-col gap-3 lg:grid lg:grid-cols-7 lg:gap-2">
      {days.map((day, i) => {
        const load = loads[i];
        const items: Item[] = [
          ...blocks.flatMap((b): Item[] => {
            const task = taskMap.get(b.taskId);
            return b.dayIndex === i && task
              ? [{ kind: 'task', start: b.startTime, end: b.endTime, task }]
              : [];
          }),
          ...events
            .filter((e) => e.start >= day.date && e.start < day.urgentUntil)
            .map((event): Item => ({
              kind: 'event',
              start: event.start,
              end: event.end,
              event,
            })),
        ].sort((a, b) => a.start.getTime() - b.start.getTime());

        const label =
          i === 0
            ? 'Today'
            : i === 1
              ? 'Tomorrow'
              : day.date.toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  timeZone,
                });
        // Menus in the right-hand columns open leftwards, so they stay on screen.
        const panelSide = i >= 4 ? 'left-0 lg:right-0 lg:left-auto' : 'left-0';

        return (
          <li
            key={day.date.getTime()}
            aria-label={`${formatShortDay(day.date, timeZone)}: ${day.isDayOff ? 'day off' : `${load.percent}% full`}`}
            className={`flex min-w-0 flex-col gap-1.5 rounded-xl border p-2.5 lg:min-h-[28rem] ${
              day.isDayOff
                ? 'border-dashed border-line bg-transparent'
                : `bg-surface ${i === 0 ? 'border-accent' : 'border-line'}`
            }`}
          >
            <div className="border-b border-line-soft px-0.5 pb-2">
              <p className="font-display text-[15px] font-semibold">{label}</p>
              <p className="text-xs text-muted tabular-nums">
                {day.isDayOff
                  ? 'Day off'
                  : i === 0 &&
                      day.start > day.workDayStart &&
                      day.start < day.end
                    ? `From ${formatClock(day.start, timeZone)} to ${day.hours.endTime}`
                    : `${day.hours.startTime}–${day.hours.endTime}`}
              </p>
              <div
                aria-hidden={day.isDayOff}
                className={`mt-2 h-1 overflow-hidden rounded-full ${day.isDayOff ? 'invisible' : 'bg-subtle'}`}
                title={`${load.percent}% full, ${formatMinutes(load.busyMinutes)} busy`}
              >
                <div
                  className={`h-full rounded-full bg-accent ${load.percent >= 100 ? '' : 'opacity-70'}`}
                  style={{ width: `${load.percent}%` }}
                />
              </div>
            </div>

            {items.length === 0 ? (
              <p className="px-0.5 pt-1 text-xs text-muted">
                {day.isDayOff
                  ? 'Nothing planned'
                  : i === 0 && day.start >= day.end
                    ? 'Working hours are over'
                    : 'Free'}
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {items.map((item) => {
                  const time = `${formatClock(item.start, timeZone)}–${formatClock(item.end, timeZone)}`;

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
                          heading={
                            <MenuHeading
                              title={event.title}
                              detail={`${formatShortDay(event.start, timeZone)}, ${time} · ${event.repeatsWeekly ? 'Weekly' : 'Fixed'}`}
                            />
                          }
                          panelClassName={panelSide}
                          triggerClassName={`${itemClass} border border-dashed border-line bg-subtle hover:border-muted`}
                          trigger={
                            <>
                              <span className="block text-[11px] text-muted tabular-nums">
                                {time}
                              </span>
                              <span className="block text-xs leading-snug font-medium break-words text-ink-2">
                                {event.title}
                                {event.repeatsWeekly && <RepeatIcon />}
                              </span>
                              <span className="sr-only">
                                {event.repeatsWeekly ? ' · Weekly' : ''}. Edit
                                or delete
                              </span>
                            </>
                          }
                        />
                      </li>
                    );
                  }

                  const { task } = item;
                  const isLate = late.has(task.id);
                  return (
                    <li key={`task-${task.id}-${item.start.getTime()}`}>
                      <TaskMenu
                        task={{ ...task, deadline: task.deadline ?? null }}
                        heading={
                          <MenuHeading
                            title={task.title}
                            detail={`${formatShortDay(item.start, timeZone)}, ${time}`}
                          />
                        }
                        panelClassName={panelSide}
                        triggerClassName={`${itemClass} bg-accent-tint shadow-[inset_3px_0_0_var(--color-accent-edge)] hover:brightness-[0.97]`}
                        trigger={
                          <>
                            <span className="block text-[11px] text-ink-2 tabular-nums">
                              {time}
                            </span>
                            <span className="block text-xs leading-snug font-semibold break-words">
                              {task.title}
                            </span>
                            {isLate && (
                              <span className="mt-0.5 block text-[11px] font-semibold text-danger">
                                Late
                              </span>
                            )}
                            <span className="sr-only">
                              . Edit, mark as done or delete
                            </span>
                          </>
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
