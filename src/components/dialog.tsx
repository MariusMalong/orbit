'use client';

import { useEffect, useRef } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  wide?: boolean; // For forms with rows of inputs, like the working-hours editor
  children: React.ReactNode;
}

/**
 * A modal built on the native <dialog> element, which handles the backdrop,
 * focus trapping and Escape, and sits above everything else on the page.
 * Clicking the backdrop closes it too.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  wide = false,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
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
      className={`m-auto w-[calc(100%-2rem)] ${wide ? 'max-w-xl' : 'max-w-md'} rounded-xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-scrim`}
    >
      {open && <div className="p-6">{children}</div>}
    </dialog>
  );
}
