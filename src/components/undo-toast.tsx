'use client';

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react';
import {
  completeTask,
  deleteTask,
  reopenTask,
  restoreTask,
} from '@/app/actions/task';

// A message at the bottom of the screen after marking a task done or
// deleting it, with an Undo button. It's safer than asking "Are you sure?"
// every time: the action happens at once, and a slip is one tap to reverse.

const SHOW_FOR_MS = 8_000;

type Toast = { id: number; message: string; undo: () => Promise<void> };

// One toast at a time, shared by every button on the page (a tiny store, so
// any component can show it without passing callbacks around).
let current: Toast | null = null;
let nextId = 1;
const listeners = new Set<() => void>();
const setToast = (toast: Toast | null) => {
  current = toast;
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function showUndo(message: string, undo: () => Promise<void>) {
  setToast({ id: nextId++, message, undo });
}

const taskForm = (taskId: string) => {
  const formData = new FormData();
  formData.set('taskId', taskId);
  return formData;
};

/** Marks a task done, then offers to undo it. */
export async function completeWithUndo(task: { id: string; title: string }) {
  await completeTask(taskForm(task.id));
  showUndo(`Marked “${task.title}” as done`, () =>
    reopenTask(taskForm(task.id))
  );
}

/** Deletes a task (kept for a day, see lib/cleanup.ts), then offers to undo it. */
export async function deleteWithUndo(task: { id: string; title: string }) {
  await deleteTask(taskForm(task.id));
  showUndo(`Deleted “${task.title}”`, () => restoreTask(taskForm(task.id)));
}

/** Where the toast appears. In the root layout, so it outlasts navigation. */
export function UndoToast() {
  const toast = useSyncExternalStore(
    subscribe,
    () => current,
    () => null
  );
  const [isHeld, setIsHeld] = useState(false); // Hovered or focused
  const [isUndoing, setIsUndoing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Gone after a few seconds, but not while the pointer or focus is on it,
  // so there's time to read it and reach the button (WCAG 2.2.1).
  useEffect(() => {
    if (!toast || isHeld) return;
    const timer = setTimeout(() => setToast(null), SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, [toast, isHeld]);

  async function undo() {
    if (!toast) return;
    setIsUndoing(true);
    try {
      await toast.undo();
      setToast(null);
    } finally {
      setIsUndoing(false);
    }
  }

  return (
    // The live region is always there, so screen readers announce the
    // message when it appears.
    <div
      ref={rootRef}
      role="status"
      aria-label="Undo"
      className="pointer-events-none fixed right-20 bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 z-50 flex justify-center md:right-4 md:bottom-6"
      onPointerEnter={() => setIsHeld(true)}
      onPointerLeave={() => setIsHeld(false)}
      onFocus={() => setIsHeld(true)}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget)) setIsHeld(false);
      }}
    >
      {toast && (
        <div
          key={toast.id}
          className="pointer-events-auto flex max-w-md min-w-0 items-center gap-3 rounded-xl bg-ink py-2 pr-2 pl-4 text-sm text-canvas shadow-float motion-safe:animate-pop-in"
        >
          <p className="min-w-0 truncate">{toast.message}</p>
          <button
            type="button"
            onClick={undo}
            disabled={isUndoing}
            className="min-h-10 shrink-0 rounded-lg px-3 font-semibold text-canvas underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-canvas focus-visible:outline-none disabled:opacity-60"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            className="grid min-h-10 min-w-10 shrink-0 place-items-center rounded-lg text-canvas/80 hover:text-canvas focus-visible:ring-2 focus-visible:ring-canvas focus-visible:outline-none"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

/** The Now card's Done button. */
export function DoneButton({
  task,
  className,
}: {
  task: { id: string; title: string };
  className: string;
}) {
  // A transition, so a failure reaches the error page (app/error.tsx).
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => completeWithUndo(task))}
      className={className}
    >
      Done
    </button>
  );
}
