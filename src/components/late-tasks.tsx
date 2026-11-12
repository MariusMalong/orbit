'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { completeWithUndo } from '@/components/undo-toast';
import { EditTaskDialog } from '@/components/edit-task-dialog';

export interface LateTask {
  id: string;
  title: string;
  durationEstimate: number;
  priority: number;
  deadline: Date | null;
  plannedStart: Date | null;
  projectId: string | null;
  reason: string; // From lateReason, e.g. "was due 18:00. It's planned…"
}

const action =
  'inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-danger/40 bg-surface px-3 text-sm font-medium text-ink ' +
  'transition hover:bg-subtle focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none disabled:opacity-60';

/**
 * Tasks that won't make their deadline, at the top of Today, each with what
 * can be done about it: change the task (a later due date, a smaller
 * estimate) or mark it done. `children` adds more ways out, such as the
 * working-hours editor.
 */
export function LateTasks({
  tasks,
  children,
}: {
  tasks: LateTask[];
  children?: React.ReactNode;
}) {
  if (tasks.length === 0) return null;

  return (
    <section
      aria-labelledby="late-heading"
      className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-3"
    >
      <h2 id="late-heading" className="text-sm font-semibold text-danger">
        {tasks.length === 1
          ? "1 task won't make its deadline"
          : `${tasks.length} tasks won't make their deadlines`}
      </h2>
      <ul className="mt-2 flex flex-col gap-3">
        {tasks.map((task) => (
          <LateTaskRow key={task.id} task={task} />
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-danger/20 pt-3 text-sm">
        {children}
        <Link
          href="/week"
          className="rounded font-medium text-ink underline decoration-danger/60 underline-offset-2 hover:decoration-danger focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
        >
          See the week
        </Link>
      </div>
    </section>
  );
}

function LateTaskRow({ task }: { task: LateTask }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p className="min-w-0 flex-1 basis-64 text-sm text-ink-2">
        <strong className="font-semibold text-ink">{task.title}</strong>{' '}
        {task.reason}
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className={action}
        >
          Change task<span className="sr-only">: {task.title}</span>
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await completeWithUndo(task);
            })
          }
          className={action}
        >
          Mark as done<span className="sr-only">: {task.title}</span>
        </button>
      </div>
      <EditTaskDialog
        task={task}
        open={isEditing}
        onClose={() => setIsEditing(false)}
      />
    </li>
  );
}
