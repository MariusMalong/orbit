'use client';

import { useState } from 'react';
import { updateCommitment } from '@/app/actions/commitments';
import { buttonPrimary, buttonSecondary, fieldInput, fieldLabel } from '@/components/ui-classes';
import { formatForDateTimeInput } from '@/lib/format';

interface EditCommitmentProps {
  commitment: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
  };
}

export function EditCommitmentModal({ commitment }: EditCommitmentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const headingId = `edit-commitment-heading-${commitment.id}`;

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
            <h2 id={headingId} className="mb-4 font-display text-lg font-semibold">Edit commitment</h2>
            <form
              action={async (formData) => {
                await updateCommitment(formData);
                setIsOpen(false);
              }}
              className="flex flex-col gap-3"
            >
              <input type="hidden" name="commitmentId" value={commitment.id} />

              <label htmlFor={`edit-commitment-title-${commitment.id}`} className={fieldLabel}>
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
                <label htmlFor={`edit-commitment-start-${commitment.id}`} className={`${fieldLabel} flex-[1_1_160px]`}>
                  Starts
                  <input
                    type="datetime-local"
                    name="startTime"
                    id={`edit-commitment-start-${commitment.id}`}
                    defaultValue={formatForDateTimeInput(new Date(commitment.startTime))}
                    required
                    className={fieldInput}
                  />
                </label>
                <label htmlFor={`edit-commitment-end-${commitment.id}`} className={`${fieldLabel} flex-[1_1_160px]`}>
                  Ends
                  <input
                    type="datetime-local"
                    name="endTime"
                    id={`edit-commitment-end-${commitment.id}`}
                    defaultValue={formatForDateTimeInput(new Date(commitment.endTime))}
                    required
                    className={fieldInput}
                  />
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
