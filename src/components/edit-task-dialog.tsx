'use client';

import { Dialog } from '@/components/dialog';
import { updateTask } from '@/app/actions/task';
import { formatForDateTimeInput } from '@/lib/format';
import {
  buttonPrimary,
  buttonSecondary,
  fieldInput,
  fieldLabel,
} from '@/components/ui-classes';

interface EditTaskProps {
  open: boolean;
  onClose: () => void;
  task: {
    id: string;
    title: string;
    durationEstimate: number;
    priority: number;
    deadline: Date | null;
  };
}

/** The edit form for a task, in a modal dialog. The caller decides when it's open. */
export function EditTaskDialog({ task, open, onClose }: EditTaskProps) {
  const headingId = `edit-task-heading-${task.id}`;

  return (
    <Dialog open={open} onClose={onClose} labelledBy={headingId}>
      <h2 id={headingId} className="mb-4 font-display text-lg font-semibold">
        Edit task
      </h2>
      <form
        action={async (formData) => {
          await updateTask(formData);
          onClose();
        }}
        className="flex flex-col gap-3"
      >
        <input type="hidden" name="taskId" value={task.id} />

        <label htmlFor={`edit-task-title-${task.id}`} className={fieldLabel}>
          Title
          <input
            type="text"
            name="title"
            id={`edit-task-title-${task.id}`}
            defaultValue={task.title}
            required
            autoFocus
            className={fieldInput}
          />
        </label>

        <div className="flex gap-3">
          <label
            htmlFor={`edit-task-duration-${task.id}`}
            className={`${fieldLabel} flex-1`}
          >
            Minutes left
            <input
              type="number"
              name="durationEstimate"
              id={`edit-task-duration-${task.id}`}
              defaultValue={task.durationEstimate}
              min="1"
              required
              className={fieldInput}
            />
          </label>
          <label
            htmlFor={`edit-task-priority-${task.id}`}
            className={`${fieldLabel} flex-1`}
          >
            Priority
            <select
              name="priority"
              id={`edit-task-priority-${task.id}`}
              defaultValue={task.priority}
              className={fieldInput}
            >
              <option value={1}>Low</option>
              <option value={2}>Medium</option>
              <option value={3}>High</option>
            </select>
          </label>
        </div>

        <label htmlFor={`edit-task-deadline-${task.id}`} className={fieldLabel}>
          <span>
            Due <span className="font-normal text-muted">(optional)</span>
          </span>
          <input
            type="datetime-local"
            name="deadline"
            id={`edit-task-deadline-${task.id}`}
            defaultValue={
              task.deadline
                ? formatForDateTimeInput(new Date(task.deadline))
                : ''
            }
            className={fieldInput}
          />
        </label>

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onClose()}
            className={buttonSecondary}
          >
            Cancel
          </button>
          <button type="submit" className={buttonPrimary}>
            Save
          </button>
        </div>
      </form>
    </Dialog>
  );
}
