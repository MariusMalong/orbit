import { FocusTimer } from '@/components/focus-timer';
import { TaskMenu } from '@/components/item-menus';
import { formatDue, formatShortDay, PRIORITY_LABELS } from '@/lib/format';
import { panel, panelTitle } from '@/components/ui-classes';
import { toDateKey } from '@/lib/time/clock';

const isSameZonedDay = (a: Date, b: Date, timeZone: string) =>
  toDateKey(a, timeZone) === toDateKey(b, timeZone);

interface TaskListProps {
  tasks: {
    id: string;
    title: string;
    durationEstimate: number;
    priority: number;
    deadline: Date | null;
    status: string;
  }[];
  lateTaskIds: Set<string>;
  // When each task is next planned, if not today (null: not this week)
  nextPlanned: Map<string, Date | null>;
  tomorrow: Date; // Start of tomorrow, to say "tomorrow" rather than the date
  now: Date;
  timeZone: string;
}

// Darker dots for more important tasks (low is an outline); the label is also in the title and for screen readers.
const PRIORITY_DOTS: Record<number, string> = {
  3: 'bg-ink',
  2: 'bg-muted',
  1: 'border border-muted',
};

/** Every open task, one compact row each: focus, title and details, menu. */
export function TaskList({
  tasks,
  lateTaskIds,
  nextPlanned,
  tomorrow,
  now,
  timeZone,
}: TaskListProps) {
  return (
    <section aria-labelledby="tasks-heading" className={`${panel} pb-2`}>
      <h2 id="tasks-heading" className={`${panelTitle} mb-1`}>
        Tasks
      </h2>

      {tasks.length === 0 ? (
        <p className="py-3 text-sm text-muted">
          No open tasks. Add one above and it will appear on your plan.
        </p>
      ) : (
        <ul>
          {tasks.map((task) => {
            const isLate = lateTaskIds.has(task.id);
            const priority = PRIORITY_LABELS[task.priority] ?? '';
            const planned = nextPlanned.get(task.id);
            const details = [
              `${task.durationEstimate} min${task.status === 'IN_PROGRESS' ? ' left' : ''}`,
              task.status === 'IN_PROGRESS' ? 'In progress' : null,
              task.deadline ? formatDue(task.deadline, now, timeZone) : null,
              isLate ? "won't make it" : null,
              planned
                ? `Planned ${isSameZonedDay(planned, tomorrow, timeZone) ? 'tomorrow' : formatShortDay(planned, timeZone)}`
                : planned === null
                  ? 'Not planned this week'
                  : null,
            ].filter(Boolean);

            return (
              <li
                key={task.id}
                className="flex items-center gap-3 border-t border-line-soft py-2.5 first:border-t-0"
              >
                <FocusTimer taskId={task.id} taskTitle={task.title} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium break-words">
                    {task.title}
                  </p>
                  <p
                    className={`text-xs ${isLate ? 'text-danger' : 'text-muted'}`}
                  >
                    {details.join(' · ')}
                  </p>
                </div>
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOTS[task.priority] ?? 'border border-muted'}`}
                  title={`${priority} priority`}
                >
                  <span className="sr-only">{priority} priority</span>
                </span>
                <TaskMenu
                  task={task}
                  label={`More for ${task.title}`}
                  panelClassName="right-0"
                  triggerClassName="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-subtle hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
                  trigger={
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <circle cx="5" cy="12" r="1.8" />
                      <circle cx="12" cy="12" r="1.8" />
                      <circle cx="19" cy="12" r="1.8" />
                    </svg>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
