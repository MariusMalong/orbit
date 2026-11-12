'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { startFocus, stopFocus } from '@/app/actions/time-entry';

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
 *
 * The timer itself is kept on the server (see actions/time-entry.ts), so
 * `running` is the one the page found when it loaded. Buttons change straight
 * away, before the server has answered.
 */
export function FocusProvider({
  running,
  children,
}: {
  running: ActiveFocus | null;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState<ActiveFocus | null>(running);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Follow the server when the page is redrawn: for example, marking a task
  // done stops its timer.
  const runningKey = running
    ? `${running.taskId}@${running.startedAt.getTime()}`
    : '';
  const [seenKey, setSeenKey] = useState(runningKey);
  if (runningKey !== seenKey) {
    setSeenKey(runningKey);
    setActive(running);
  }

  // Tick once a second while a timer runs. The elapsed time is worked out
  // from the start time, so it stays right even if a tick is delayed.
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  async function stop() {
    if (!active) return;
    setActive(null);
    setSavingTaskId(active.taskId);
    try {
      await stopFocus();
    } finally {
      setSavingTaskId(null);
    }
  }

  async function start(taskId: string) {
    setNow(Date.now());
    setActive({ taskId, startedAt: new Date() });
    const formData = new FormData();
    formData.set('taskId', taskId);
    await startFocus(formData); // Stops and logs any other timer first
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
