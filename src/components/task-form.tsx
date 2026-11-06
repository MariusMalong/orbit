import { createTask } from '@/app/actions/task';
import {
  buttonAccent,
  fieldInput,
  fieldLabel,
  panel,
  panelTitle,
} from '@/components/ui-classes';

export function TaskForm() {
  return (
    <section aria-labelledby="new-task-heading" className={panel}>
      <h2 id="new-task-heading" className={`${panelTitle} mb-3`}>
        New task
      </h2>

      <form action={createTask} className="flex flex-col gap-3">
        <label htmlFor="task-title" className={fieldLabel}>
          Title
          <input
            type="text"
            name="title"
            id="task-title"
            required
            placeholder="e.g. Plan next week's meals"
            className={fieldInput}
          />
        </label>

        <div className="flex gap-3">
          <label htmlFor="task-duration" className={`${fieldLabel} flex-1`}>
            Minutes
            <input
              type="number"
              name="durationEstimate"
              id="task-duration"
              required
              min="1"
              placeholder="45"
              className={fieldInput}
            />
          </label>

          <label htmlFor="task-priority" className={`${fieldLabel} flex-1`}>
            Priority
            <select
              name="priority"
              id="task-priority"
              defaultValue="2"
              className={fieldInput}
            >
              <option value="1">Low</option>
              <option value="2">Medium</option>
              <option value="3">High</option>
            </select>
          </label>
        </div>

        <label htmlFor="task-deadline" className={fieldLabel}>
          <span>
            Due <span className="font-normal text-muted">(optional)</span>
          </span>
          <input
            type="datetime-local"
            name="deadline"
            id="task-deadline"
            className={fieldInput}
          />
        </label>

        <button type="submit" className={buttonAccent}>
          Add to plan
        </button>
      </form>
    </section>
  );
}
