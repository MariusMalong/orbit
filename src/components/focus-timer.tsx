'use client';

import { useState, useEffect } from 'react';
import { logTimeEntry } from '@/app/actions/time-entry';

export function FocusTimer({ taskId }: { taskId: string }) {
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
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isSaving}
      className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-mono font-medium transition-colors ${
        isActive 
          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30' 
          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
      }`}
    >
      {isSaving ? (
        'Saving...'
      ) : isActive ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
          </span>
          Stop ({formatTime(seconds)})
        </>
      ) : (
        '▶ Start Focus'
      )}
    </button>
  );
}