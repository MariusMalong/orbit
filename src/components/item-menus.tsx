'use client';

import { useState, useTransition } from 'react';
import { completeTask, deleteTask } from '@/app/actions/task';
import { deleteCommitment } from '@/app/actions/commitments';
import { EditTaskDialog } from '@/components/edit-task-dialog';
import { EditCommitmentDialog } from '@/components/edit-commitment-dialog';
import { MenuButton, Popover } from '@/components/popover';

// Menus for a task or an event. The trigger can be anything: a "⋯" button in
// the task list, or a whole block on the timeline. The edit dialog lives
// outside the popover, so it stays open after the menu closes.

interface MenuLayout {
  label: string;
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
    startTime: Date;
    endTime: Date;
  };
}

export function EventMenu({ commitment, heading, ...layout }: EventMenuProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      const formData = new FormData();
      formData.set('commitmentId', commitment.id);
      await deleteCommitment(formData);
    });

  return (
    <>
      <Popover {...layout}>
        {heading}
        <MenuButton onClick={() => setIsEditing(true)}>Edit</MenuButton>
        <MenuButton onClick={remove} disabled={isPending} danger>
          Delete
        </MenuButton>
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
