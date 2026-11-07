'use client';

import { useState, useTransition } from 'react';
import { completeTask, deleteTask, placeTask } from '@/app/actions/task';
import { deleteCommitment } from '@/app/actions/commitments';
import { EditTaskDialog } from '@/components/edit-task-dialog';
import { EditCommitmentDialog } from '@/components/edit-commitment-dialog';
import { MenuButton, Popover } from '@/components/popover';

// Menus for a task or an event. The trigger can be anything: a "⋯" button in
// the task list, or a whole block on the timeline. The edit dialog lives
// outside the popover, so it stays open after the menu closes.

interface MenuLayout {
  label?: string; // Only for triggers without visible text (see Popover)
  trigger: React.ReactNode;
  triggerClassName: string;
  className?: string;
  style?: React.CSSProperties;
  panelClassName?: string;
  /** Shown at the top of the panel, e.g. the item's title and time. */
  heading?: React.ReactNode;
}

interface TaskMenuProps extends MenuLayout {
  task: {
    id: string;
    title: string;
    durationEstimate: number;
    priority: number;
    deadline: Date | null;
    plannedStart?: Date | null; // Set when the user placed it at a time
  };
}

export function TaskMenu({ task, heading, ...layout }: TaskMenuProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const run = (action: (formData: FormData) => Promise<void>) =>
    startTransition(async () => {
      const formData = new FormData();
      formData.set('taskId', task.id);
      await action(formData);
    });

  return (
    <>
      <Popover {...layout}>
        {heading}
        <MenuButton onClick={() => setIsEditing(true)}>Edit</MenuButton>
        {task.plannedStart && (
          // An empty start hands the task back to the planner.
          <MenuButton onClick={() => run(placeTask)} disabled={isPending}>
            Let Orbit plan it
          </MenuButton>
        )}
        <MenuButton onClick={() => run(completeTask)} disabled={isPending}>
          Mark as done
        </MenuButton>
        <MenuButton onClick={() => run(deleteTask)} disabled={isPending} danger>
          Delete
        </MenuButton>
      </Popover>
      <EditTaskDialog
        task={task}
        open={isEditing}
        onClose={() => setIsEditing(false)}
      />
    </>
  );
}

interface EventMenuProps extends MenuLayout {
  commitment: {
    id: string;
    title: string;
    startTime: Date; // For a weekly event, the clicked occurrence's times
    endTime: Date;
    repeatsWeekly: boolean;
  };
}

export function EventMenu({ commitment, heading, ...layout }: EventMenuProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // For a weekly event, "this" skips only the clicked occurrence.
  const remove = (scope: 'this' | 'all') =>
    startTransition(async () => {
      const formData = new FormData();
      formData.set('commitmentId', commitment.id);
      formData.set('scope', scope);
      formData.set('occurrenceStart', commitment.startTime.toISOString());
      await deleteCommitment(formData);
    });

  return (
    <>
      <Popover {...layout}>
        {heading}
        <MenuButton onClick={() => setIsEditing(true)}>Edit</MenuButton>
        {commitment.repeatsWeekly ? (
          <>
            <MenuButton
              onClick={() => remove('this')}
              disabled={isPending}
              danger
            >
              Delete this one
            </MenuButton>
            <MenuButton
              onClick={() => remove('all')}
              disabled={isPending}
              danger
            >
              Delete every week
            </MenuButton>
          </>
        ) : (
          <MenuButton onClick={() => remove('all')} disabled={isPending} danger>
            Delete
          </MenuButton>
        )}
      </Popover>
      <EditCommitmentDialog
        commitment={commitment}
        open={isEditing}
        onClose={() => setIsEditing(false)}
      />
    </>
  );
}

/** Title and details at the top of a block's menu. */
export function MenuHeading({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="mb-1 border-b border-line-soft px-3 pt-1.5 pb-2.5">
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted">{detail}</p>
    </div>
  );
}
