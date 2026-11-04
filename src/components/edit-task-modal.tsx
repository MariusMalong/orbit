'use client';

import { useState } from 'react';
import { updateTask } from '@/app/actions/task';
import { buttonPrimary, buttonSecondary, fieldInput, fieldLabel } from '@/components/ui-classes';

interface EditTaskProps {
  task: {
    id: string;
    title: string;
    durationEstimate: number;
    priority: number;
  };
}

export function EditTaskModal({ task }: EditTaskProps) {
  const [isOpen, setIsOpen] = useState(false);
  const headingId = `edit-task-heading-${task.id}`;

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={buttonSecondary}>
        Edit
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-xl"
          >
            <h2 id={headingId} className="mb-4 font-display text-lg font-semibold">Edit task</h2>
            <form
              action={async (formData) => {
                await updateTask(formData);
                setIsOpen(false);
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
                <label htmlFor={`edit-task-duration-${task.id}`} className={`${fieldLabel} flex-1`}>
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
                <label htmlFor={`edit-task-priority-${task.id}`} className={`${fieldLabel} flex-1`}>
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

              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsOpen(false)} className={buttonSecondary}>
                  Cancel
                </button>
                <button type="submit" className={buttonPrimary}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
