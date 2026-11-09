import { FocusTimer } from '@/components/focus-timer';
import { TaskMenu } from '@/components/item-menus';
import { formatDue, formatShortDay } from '@/lib/format';
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

// One small piece of a task's details. Spaced apart rather than joined with
// dots, so each can be picked out at a glance.
function Meta({
  children,
  className = 'text-muted',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {children}
    </span>
  );
}

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
            const inProgress = task.status === 'IN_PROGRESS';
            const planned = nextPlanned.get(task.id);
            const plannedText = planned
              ? `Planned ${isSameZonedDay(planned, tomorrow, timeZone) ? 'tomorrow' : formatShortDay(planned, timeZone)}`
              : planned === null
                ? 'Not planned this week'
                : null;

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
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs">
                    {project && (
                      <Meta className="font-medium text-ink-2">
                        <span
                          aria-hidden="true"
                          className={`h-2 w-2 rounded-full ${projectDot(project.color)}`}
                        />
                        {project.name}
                        <span className="sr-only">,</span>
                      </Meta>
                    )}
                    {task.priority === 3 && (
                      <Meta className="rounded bg-subtle px-1.5 font-semibold text-ink">
                        High<span className="sr-only"> priority,</span>
                      </Meta>
                    )}
                    <Meta>
                      {task.durationEstimate} min{inProgress ? ' left' : ''}
                      <span className="sr-only">,</span>
                    </Meta>
                    {inProgress && (
                      <Meta className="font-medium text-ink-2">
                        In progress<span className="sr-only">,</span>
                      </Meta>
                    )}
                    {task.deadline && (
                      <Meta
                        className={
                          isLate ? 'font-medium text-danger' : 'text-muted'
                        }
                      >
                        {formatDue(task.deadline, now, timeZone)}
                        {isLate ? " · won't make it" : ''}
                        <span className="sr-only">,</span>
                      </Meta>
                    )}
                    {plannedText && <Meta>{plannedText}</Meta>}
                  </p>
                </div>
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
