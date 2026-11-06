'use client';

import { useId, useState } from 'react';
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
    startTime: Date; // For a weekly event, this occurrence's times
    endTime: Date;
    repeatsWeekly: boolean;
  };
}

/** The edit form for a fixed commitment (an event), in a modal dialog. The caller decides when it's open. */
export function EditCommitmentDialog({
  commitment,
  open,
  onClose,
}: EditCommitmentProps) {
  // Weekly occurrences share an id, so element ids come from useId instead.
  const uid = useId();
  const headingId = `${uid}-heading`;
  // For a weekly event: change just this occurrence, or every week.
  const [scope, setScope] = useState<'this' | 'all'>('this');

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
        <input
          type="hidden"
          name="occurrenceStart"
          value={new Date(commitment.startTime).toISOString()}
        />
        <input type="hidden" name="scope" value={scope} />

        {commitment.repeatsWeekly && (
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">
              This event repeats every week. Change:
            </legend>
            {(
              [
                ['this', 'Only this one'],
                ['all', 'Every week'],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-subtle"
              >
                <input
                  type="radio"
                  name={`${uid}-scope`}
                  checked={scope === value}
                  onChange={() => setScope(value)}
                  className="h-4 w-4 accent-accent"
                />
                {label}
              </label>
            ))}
          </fieldset>
        )}

        <label htmlFor={`${uid}-title`} className={fieldLabel}>
          Event
          <input
            type="text"
            name="title"
            id={`${uid}-title`}
            defaultValue={commitment.title}
            required
            autoFocus
            className={fieldInput}
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <label
            htmlFor={`${uid}-start`}
            className={`${fieldLabel} flex-[1_1_160px]`}
          >
            Starts
            <input
              type="datetime-local"
              name="startTime"
              id={`${uid}-start`}
              defaultValue={formatForDateTimeInput(
                new Date(commitment.startTime)
              )}
              required
              className={fieldInput}
            />
          </label>
          <label
            htmlFor={`${uid}-end`}
            className={`${fieldLabel} flex-[1_1_160px]`}
          >
            Ends
            <input
              type="datetime-local"
              name="endTime"
              id={`${uid}-end`}
              defaultValue={formatForDateTimeInput(
                new Date(commitment.endTime)
              )}
              required
              className={fieldInput}
            />
          </label>
        </div>

        {/* A one-off event can be made weekly; a weekly one can stop repeating. */}
        {(!commitment.repeatsWeekly || scope === 'all') && (
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-line px-3 text-sm font-medium">
            Repeats every week
            <input
              type="checkbox"
              name="repeatsWeekly"
              defaultChecked={commitment.repeatsWeekly}
              className="h-5 w-5 accent-accent"
            />
          </label>
        )}

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
