import type { PlanningDayInfo } from '@/lib/planning/days';
import type { DayLoad } from '@/lib/planning/load';
import { formatMinutes, formatShortDay } from '@/lib/format';
import { panel, panelTitle } from '@/components/ui-classes';

interface WeekCardProps {
  days: PlanningDayInfo[]; // Today first
  loads: DayLoad[]; // One per day, same order
  // Tasks with time left after today, and when they continue (null: not this week)
  leftovers: { id: string; title: string; continuesOn: Date | null }[];
  timeZone: string;
}

/**
 * How full each of the next 7 days is, plus anything that needs attention:
 * tasks that will miss their deadline and work that didn't fit today.
 */
export function WeekCard({ days, loads, leftovers, timeZone }: WeekCardProps) {
  const notThisWeek = leftovers.filter((l) => !l.continuesOn);

  return (
    <section aria-labelledby="week-heading" className={panel}>
      <h2 id="week-heading" className={`${panelTitle} mb-3`}>
        This week
      </h2>

      <ol className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => {
          const load = loads[i];
          const weekday = day.date.toLocaleDateString('en-GB', {
            weekday: 'short',
            timeZone,
          });
          const description = day.isDayOff
            ? `${i === 0 ? 'Today' : formatShortDay(day.date, timeZone)}: day off`
            : i === 0
              ? `Rest of today: ${load.percent}% full`
              : `${formatShortDay(day.date, timeZone)}: ${load.percent}% full, ${formatMinutes(load.busyMinutes)} busy`;
          return (
            <li
              key={day.date.getTime()}
              className="flex flex-col items-center gap-1.5"
              title={description}
            >
              <span className="sr-only">{description}</span>
              <div
                aria-hidden="true"
                className={`flex h-16 w-full items-end overflow-hidden rounded-md ${day.isDayOff ? 'border border-dashed border-line' : 'bg-subtle'}`}
              >
                {!day.isDayOff && (
                  <div
                    className={`w-full bg-accent motion-safe:transition-[height] motion-safe:duration-500 ${load.percent >= 100 ? '' : 'opacity-70'}`}
                    style={{ height: `${load.percent}%` }}
                  />
                )}
              </div>
              <span
                aria-hidden="true"
                className={`text-xs ${i === 0 ? 'font-semibold text-ink' : 'text-muted'}`}
              >
                {i === 0 ? 'Today' : weekday}
              </span>
            </li>
          );
        })}
      </ol>

      {leftovers.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {leftovers.length > 0 && (
            <div
              role="status"
              className="rounded-lg border border-warning-line bg-warning-bg px-3 py-2.5 text-sm text-warning-ink"
            >
              <p className="font-semibold">
                {leftovers.length === 1
                  ? "1 task didn't fit today"
                  : `${leftovers.length} tasks didn't fit today`}
              </p>
              <p className="mt-0.5">
                {notThisWeek.length === 0
                  ? 'The rest is planned under Coming up.'
                  : `Not enough time this week for: ${notThisWeek.map((l) => l.title).join(', ')}. Extend your hours or free up time.`}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
