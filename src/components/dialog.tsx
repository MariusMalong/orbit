'use client';

import { useEffect, useRef } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  wide?: boolean; // For forms with rows of inputs, like the working-hours editor
  sheet?: boolean; // Rises from the bottom of the screen, full width (phones)
  children: React.ReactNode;
}

/**
 * A modal built on the native <dialog> element, which handles the backdrop,
 * focus trapping and Escape, and sits above everything else on the page.
 * Clicking the backdrop closes it too. Mark a field with data-autofocus to
 * focus it when the dialog opens.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  wide = false,
  sheet = false,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal focuses the first control; a field marked data-autofocus
      // goes first instead. (React's autoFocus runs before the dialog opens.)
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      // The dialog itself only receives the click when it lands on the
      // backdrop; clicks on the content land on the inner div.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={`${
        sheet
          ? 'mx-0 mt-auto mb-0 max-h-[90dvh] w-full max-w-none rounded-t-2xl border-x-0 border-b-0'
          : `m-auto w-[calc(100%-2rem)] ${wide ? 'max-w-xl' : 'max-w-md'} rounded-xl`
      } border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-scrim`}
    >
      {open && (
        <div
          className={
            sheet ? 'p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]' : 'p-6'
          }
        >
          {children}
        </div>
      )}
    </dialog>
  );
}
