'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { deleteAccount } from '@/app/actions/account';
import { Dialog } from '@/components/dialog';
import { buttonDanger, buttonSecondary } from '@/components/ui-classes';

/** The "Delete my account" button, with a dialog to confirm it. */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${buttonDanger} self-start`}
      >
        Delete my account
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="delete-account-heading"
      >
        <h2
          id="delete-account-heading"
          className="font-display text-lg font-semibold"
        >
          Delete your account?
        </h2>
        <p className="mt-2 text-sm text-ink-2">
          Your tasks, events, working hours and logged time will be deleted
          straight away, and you&apos;ll be signed out. This can&apos;t be
          undone.
        </p>
        <form action={deleteAccount} className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={buttonSecondary}
          >
            Cancel
          </button>
          <ConfirmButton />
        </form>
      </Dialog>
    </>
  );
}

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonDanger}>
      {pending ? 'Deleting…' : 'Delete everything'}
    </button>
  );
}
