import { addCommitment } from '@/app/actions/commitments';
import {
  buttonSecondary,
  fieldInput,
  fieldLabel,
} from '@/components/ui-classes';

// Rendered inside the "Fixed commitments" panel on the dashboard, which owns the heading.
export function CommitmentForm() {
  return (
    <form action={addCommitment} className="flex flex-col gap-3">
      <label htmlFor="commitment-title" className={fieldLabel}>
        Event
        <input
          type="text"
          name="title"
          id="commitment-title"
          required
          placeholder="e.g. Dentist appointment"
          className={fieldInput}
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <label
          htmlFor="commitment-start"
          className={`${fieldLabel} flex-[1_1_160px]`}
        >
          Starts
          <input
            type="datetime-local"
            name="startTime"
            id="commitment-start"
            required
            className={fieldInput}
          />
        </label>

        <label
          htmlFor="commitment-end"
          className={`${fieldLabel} flex-[1_1_160px]`}
        >
          Ends
          <input
            type="datetime-local"
            name="endTime"
            id="commitment-end"
            required
            className={fieldInput}
          />
        </label>
      </div>

      <button type="submit" className={buttonSecondary}>
        Save commitment
      </button>
    </form>
  );
}
