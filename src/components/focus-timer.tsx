'use client';

import { useFocus } from '@/components/focus-context';
import { buttonAccent, buttonPrimary } from '@/components/ui-classes';

interface FocusTimerProps {
  taskId: string;
  taskTitle: string;
  /** "compact": a round play button (task list). "large": a full-width button (Now card). */
  size?: 'compact' | 'large';
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function PlayIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 4l13 8-13 8z" />
    </svg>
  );
}

function RunningDot() {
  return (
    <span className="relative flex h-2 w-2" aria-hidden="true">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-on-accent opacity-50"></span>
      <span className="relative inline-flex h-2 w-2 rounded-full bg-on-accent"></span>
    </span>
  );
}

/**
 * Starts timing work on a task. While it runs the button becomes
 * "Stop 12:34"; stopping logs the time worked. Every button for the same
 * task shares one timer (see FocusProvider).
 */
export function FocusTimer({
  taskId,
  taskTitle,
  size = 'compact',
}: FocusTimerProps) {
  const { isActive, isSaving, elapsedSeconds, start, stop } = useFocus(taskId);
  const isLarge = size === 'large';

  if (!isActive && !isSaving) {
    return isLarge ? (
      <button
        type="button"
        onClick={start}
        className={`${buttonPrimary} min-h-13 w-full text-base`}
      >
        <PlayIcon />
        Start focus
      </button>
    ) : (
      <button
        type="button"
        onClick={start}
        aria-label={`Start focus on ${taskTitle}`}
        title="Start focus"
        className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-line bg-surface text-ink transition hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
      >
        <PlayIcon />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={stop}
      disabled={isSaving}
      aria-label={isSaving ? 'Saving focus time' : `Stop focus on ${taskTitle}`}
      className={
        isLarge
          ? `${buttonAccent} min-h-13 w-full text-base`
          : 'inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-accent px-3 text-sm font-semibold text-on-accent transition hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none disabled:opacity-60'
      }
    >
      {isSaving ? (
        'Saving…'
      ) : (
        <>
          <RunningDot />
          Stop{' '}
          <span className="tabular-nums">{formatTime(elapsedSeconds)}</span>
        </>
      )}
    </button>
  );
}
