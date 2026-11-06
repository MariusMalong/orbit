'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { logTimeEntry } from '@/app/actions/time-entry';

type ActiveFocus = { taskId: string; startedAt: Date };

type FocusState = {
  active: ActiveFocus | null;
  savingTaskId: string | null;
  elapsedSeconds: number;
  start: (taskId: string) => Promise<void>;
  stop: () => Promise<void>;
};

const FocusContext = createContext<FocusState | null>(null);

/**
 * One focus timer for the whole page, so every Start focus button for a task
 * (in the task list and in the Now card) shows the same running timer.
 * Starting focus on another task stops and logs the current one first.
 */
export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveFocus | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Tick once a second while a timer runs. The elapsed time is worked out
  // from the start time, so it stays right even if a tick is delayed.
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  async function stop() {
    if (!active) return;
    const endTime = new Date();
    const seconds = (endTime.getTime() - active.startedAt.getTime()) / 1000;
    // Whole minutes, and at least one, so a short session still counts.
    const durationMinutes = Math.max(1, Math.round(seconds / 60));

    setActive(null);
    setSavingTaskId(active.taskId);

    const formData = new FormData();
    formData.append('taskId', active.taskId);
    formData.append('durationMinutes', durationMinutes.toString());
    formData.append('startTime', active.startedAt.toISOString());
    formData.append('endTime', endTime.toISOString());
    try {
      await logTimeEntry(formData);
    } finally {
      setSavingTaskId(null);
    }
  }

  async function start(taskId: string) {
    if (active) await stop();
    setNow(Date.now());
    setActive({ taskId, startedAt: new Date() });
  }

  const elapsedSeconds = active
    ? Math.max(0, Math.floor((now - active.startedAt.getTime()) / 1000))
    : 0;

  return (
    <FocusContext.Provider
      value={{ active, savingTaskId, elapsedSeconds, start, stop }}
    >
      {children}
    </FocusContext.Provider>
  );
}

/** The shared timer, as seen by one task's Start focus button. */
export function useFocus(taskId: string) {
  const focus = useContext(FocusContext);
  if (!focus) throw new Error('useFocus needs a FocusProvider above it.');

  return {
    isActive: focus.active?.taskId === taskId,
    isSaving: focus.savingTaskId === taskId,
    elapsedSeconds: focus.elapsedSeconds,
    start: () => focus.start(taskId),
    stop: focus.stop,
  };
}
