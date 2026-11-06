import type { DayBlock } from '@/lib/engine/multi-day';
import type { SchedulableTask } from '@/lib/engine/scheduler';
import type { PlanningDayInfo } from '@/lib/planning/days';
import { formatClock, formatShortDay } from '@/lib/format';
import { panel } from '@/components/ui-classes';

interface ComingUpProps {
  days: PlanningDayInfo[]; // The days after today
  blocks: DayBlock[]; // Blocks on those days; dayIndex counts from today (0)
  tasks: SchedulableTask[];
  lateTaskIds: string[];
  timeZone: string;
}

/**
 * What the multi-day planner has put on the days after today: work that
 * didn't fit today. Hidden when everything fits today.
 */
export function ComingUp({
  days,
  blocks,
  tasks,
  lateTaskIds,
  timeZone,
}: ComingUpProps) {
  if (blocks.length === 0) return null;

  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const late = new Set(lateTaskIds);
  const plannedDays = days
    .map((day, i) => ({
      day,
      label: i === 0 ? 'Tomorrow' : formatShortDay(day.date, timeZone),
      blocks: blocks.filter((b) => b.dayIndex === i + 1),
    }))
    .filter((d) => d.blocks.length > 0);

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
          What didn&apos;t fit today, planned into the next days
        </p>
      </div>

      <ol className="flex flex-col gap-4">
        {plannedDays.map(({ day, label, blocks: dayBlocks }) => (
          <li key={day.date.getTime()}>
            <h3 className="flex items-baseline gap-2 text-sm font-semibold">
              {label}
              <span className="font-normal text-muted tabular-nums">
                {day.hours.startTime}–{day.hours.endTime}
              </span>
            </h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {dayBlocks.map((block) => {
                const task = taskMap.get(block.taskId);
                if (!task) return null;
                return (
                  <li
                    key={`${block.taskId}-${block.startTime.getTime()}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg bg-accent-tint px-3 py-2 text-sm shadow-[inset_3px_0_0_var(--color-accent-edge)]"
                  >
                    {/* On phones the time gets its own line so the title has room */}
                    <span className="w-full text-xs text-ink-2 tabular-nums sm:w-24 sm:shrink-0 sm:text-sm">
                      {formatClock(block.startTime, timeZone)}–
                      {formatClock(block.endTime, timeZone)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {task.title}
                    </span>
                    {late.has(task.id) && (
                      <span className="shrink-0 text-xs font-medium text-danger">
                        Late
                      </span>
                    )}
                    <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-medium">
                      P{task.priority}
                    </span>
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
