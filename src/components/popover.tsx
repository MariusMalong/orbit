'use client';

import { useEffect, useId, useRef, useState } from 'react';

interface PopoverProps {
  /** Accessible name for the trigger button. */
  label: string;
  /** What the trigger button shows. */
  trigger: React.ReactNode;
  triggerClassName: string;
  /** Classes and inline style for the wrapper, e.g. absolute positioning on the timeline. */
  className?: string;
  style?: React.CSSProperties;
  /** Extra classes for the panel, e.g. its horizontal alignment. */
  panelClassName?: string;
  children: React.ReactNode;
}

/**
 * A button that opens a small panel below it. Clicking outside or pressing
 * Escape closes it, and so does clicking anything in the panel marked with
 * `data-close`.
 *
 * Don't mark a form's submit button with `data-close`: closing removes the
 * form before the browser submits it.
 */
export function Popover({
  label,
  trigger,
  triggerClassName,
  className = 'relative',
  style,
  panelClassName = 'right-0',
  children,
}: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    // An open popover is lifted above the timeline blocks that follow it.
    <div
      ref={rootRef}
      className={`${className} ${isOpen ? 'z-30' : ''}`}
      style={style}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          id={panelId}
          className={`absolute top-full z-30 mt-1 min-w-52 rounded-xl border border-line bg-surface p-1.5 text-ink shadow-lg ${panelClassName}`}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('[data-close]')) {
              setIsOpen(false);
            }
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** A full-width row in a popover panel. Closes the popover when clicked. */
export function MenuButton({
  onClick,
  danger = false,
  disabled = false,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-close
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm font-medium transition hover:bg-subtle focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none disabled:opacity-60 ${danger ? 'text-danger' : 'text-ink'}`}
    >
      {children}
    </button>
  );
}
