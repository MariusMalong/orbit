'use client';

import { Dialog } from '@/components/dialog';
import { updateCommitment } from '@/app/actions/commitments';
import {
  buttonPrimary,
  buttonSecondary,
  fieldInput,
  fieldLabel,
} from '@/components/ui-classes';
import { formatForDateTimeInput } from '@/lib/format';

interface EditCommitmentProps {
  open: boolean;
  onClose: () => void;
  commitment: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
  };
}

/** The edit form for a fixed commitment (an event), in a modal dialog. The caller decides when it's open. */
export function EditCommitmentDialog({
  commitment,
  open,
  onClose,
}: EditCommitmentProps) {
  const headingId = `edit-commitment-heading-${commitment.id}`;

  return (
    <Dialog open={open} onClose={onClose} labelledBy={headingId}>
      <h2 id={headingId} className="mb-4 font-display text-lg font-semibold">
        Edit event
      </h2>
      <form
        action={async (formData) => {
          await updateCommitment(formData);
          onClose();
        }}
        className="flex flex-col gap-3"
      >
        <input type="hidden" name="commitmentId" value={commitment.id} />

        <label
          htmlFor={`edit-commitment-title-${commitment.id}`}
          className={fieldLabel}
        >
          Event
          <input
            type="text"
            name="title"
            id={`edit-commitment-title-${commitment.id}`}
            defaultValue={commitment.title}
            required
            autoFocus
            className={fieldInput}
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <label
            htmlFor={`edit-commitment-start-${commitment.id}`}
            className={`${fieldLabel} flex-[1_1_160px]`}
          >
            Starts
            <input
              type="datetime-local"
              name="startTime"
              id={`edit-commitment-start-${commitment.id}`}
              defaultValue={formatForDateTimeInput(
                new Date(commitment.startTime)
              )}
              required
              className={fieldInput}
            />
          </label>
          <label
            htmlFor={`edit-commitment-end-${commitment.id}`}
            className={`${fieldLabel} flex-[1_1_160px]`}
          >
            Ends
            <input
              type="datetime-local"
              name="endTime"
              id={`edit-commitment-end-${commitment.id}`}
              defaultValue={formatForDateTimeInput(
                new Date(commitment.endTime)
              )}
              required
              className={fieldInput}
            />
          </label>
        </div>

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
