'use client';

import { useState, useEffect } from 'react';
import { logTimeEntry } from '@/app/actions/time-entry';

interface FocusTimerProps {
  taskId: string;
  taskTitle: string;
}

/**
 * A round play button that starts timing work on a task. While running it
 * becomes a "Stop 12:34" pill; stopping logs the time worked.
 */
export function FocusTimer({ taskId, taskTitle }: FocusTimerProps) {
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleToggle = async () => {
    if (!isActive) {
      // Start the timer
      setIsActive(true);
      setStartTime(new Date());
    } else {
      // Stop and Save
      setIsActive(false);
      setIsSaving(true);

      const endTime = new Date();
      // Round to nearest minute, minimum 1 minute to avoid 0-minute logs
      const durationMinutes = Math.max(1, Math.round(seconds / 60));

      const formData = new FormData();
      formData.append('taskId', taskId);
      formData.append('durationMinutes', durationMinutes.toString());
      formData.append('startTime', startTime!.toISOString());
      formData.append('endTime', endTime.toISOString());

      await logTimeEntry(formData);

      setSeconds(0);
      setStartTime(null);
      setIsSaving(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!isActive && !isSaving) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Start focus on ${taskTitle}`}
        title="Start focus"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink transition hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M7 4l13 8-13 8z" />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isSaving}
      aria-label={isSaving ? 'Saving focus time' : `Stop focus on ${taskTitle}`}
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-accent px-3 text-sm font-semibold text-on-accent transition hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none disabled:opacity-60"
    >
      {isSaving ? (
        'Saving…'
      ) : (
        <>
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-on-accent opacity-50"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-on-accent"></span>
          </span>
          Stop <span className="tabular-nums">{formatTime(seconds)}</span>
        </>
      )}
    </button>
  );
}
