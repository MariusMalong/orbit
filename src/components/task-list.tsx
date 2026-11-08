import { FocusTimer } from '@/components/focus-timer';
import { TaskMenu } from '@/components/item-menus';
import { formatDue, formatShortDay, PRIORITY_LABELS } from '@/lib/format';
import { panel, panelTitle } from '@/components/ui-classes';
import { toDateKey } from '@/lib/time/clock';
import Link from 'next/link';
import { ProjectsDialog } from '@/components/projects-dialog';
import { projectDot, type ProjectInfo } from '@/lib/projects';

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
    projectId: string | null;
  }[];
  projects: ProjectInfo[];
  /** Show only this project's tasks (from the ?project= link), if set. */
  projectFilter?: string;
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
  projects,
  projectFilter,
}: TaskListProps) {
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const filter =
    projectFilter && projectById.has(projectFilter) ? projectFilter : null;
  const shown = filter ? tasks.filter((t) => t.projectId === filter) : tasks;
  const chip =
    'inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition ' +
    'focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none';

  return (
    <section aria-labelledby="tasks-heading" className={`${panel} pb-2`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 id="tasks-heading" className={panelTitle}>
          Tasks
        </h2>
        <ProjectsDialog triggerClassName="min-h-9 cursor-pointer rounded-lg px-2.5 text-sm text-muted transition hover:bg-subtle hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none" />
      </div>

      {projects.length > 0 && (
        <nav
          aria-label="Filter tasks by project"
          className="mb-2 flex flex-wrap gap-1.5"
        >
          <Link
            href="/"
            scroll={false}
            aria-current={filter ? undefined : 'true'}
            className={`${chip} ${filter ? 'border-line text-muted hover:text-ink' : 'border-ink text-ink'}`}
          >
            All
          </Link>
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/?project=${p.id}`}
              scroll={false}
              aria-current={filter === p.id ? 'true' : undefined}
              className={`${chip} ${filter === p.id ? 'border-ink text-ink' : 'border-line text-muted hover:text-ink'}`}
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${projectDot(p.color)}`}
              />
              {p.name}
            </Link>
          ))}
        </nav>
      )}

      {shown.length === 0 && filter ? (
        <p className="py-3 text-sm text-muted">
          No open tasks in this project.
        </p>
      ) : tasks.length === 0 ? (
        <p className="py-3 text-sm text-muted">
          No open tasks. Add one above and it will appear on your plan.
        </p>
      ) : (
        <ul>
          {shown.map((task) => {
            const project = task.projectId
              ? projectById.get(task.projectId)
              : undefined;
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
                    {project && (
                      <>
                        <span
                          aria-hidden="true"
                          className={`mr-1 inline-block h-2 w-2 rounded-full ${projectDot(project.color)}`}
                        />
                        {project.name} ·{' '}
                      </>
                    )}
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
