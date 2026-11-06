'use client';

import { useEffect, useRef, useState } from 'react';
import { createTask } from '@/app/actions/task';
import { addCommitment } from '@/app/actions/commitments';
import { buttonAccent } from '@/components/ui-classes';
import { addMinutesToClock, isAfter, nextHalfHour } from '@/lib/time/clock';

/** Times for a new event, as date and time inputs expect them. */
export type EventDraft = {
  date: string; // "2026-11-06"
  start: string; // "14:00"
  end: string; // "15:00"
};

const ADD_EVENT = 'orbit:add-event';

/**
 * Opens the quick-add bar in event mode with these times filled in. Used by
 * the timeline's hour labels and free slots.
 */
export function requestAddEvent(draft: EventDraft) {
  window.dispatchEvent(
    new CustomEvent<EventDraft>(ADD_EVENT, { detail: draft })
  );
}

const chip =
  'min-h-10 rounded-full border border-line bg-surface px-3 text-sm text-ink tabular-nums ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60';

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} h` : `${hours.toFixed(1)} h`;
}

interface QuickAddProps {
  today: string; // Today's date in the visitor's timezone, "2026-11-06"
}

/**
 * One bar for adding both tasks and events, at the top of the dashboard.
 * Tasks need a title, an estimate and a priority; events a title and a time.
 */
export function QuickAdd({ today }: QuickAddProps) {
  const [mode, setMode] = useState<'task' | 'event'>('task');
  const [title, setTitle] = useState('');
  const [showDue, setShowDue] = useState(false);
  const [event, setEvent] = useState<EventDraft>({
    date: today,
    start: '09:00',
    end: '10:00',
  });
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // A click on the timeline asks for an event at a particular time.
  useEffect(() => {
    const handleAddEvent = (e: Event) => {
      setMode('event');
      setEvent((e as CustomEvent<EventDraft>).detail);
      setError('');
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      titleRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener(ADD_EVENT, handleAddEvent);
    return () => window.removeEventListener(ADD_EVENT, handleAddEvent);
  }, []);

  function switchToEvent() {
    if (mode === 'event') return;
    // Suggest the next half hour today, for an hour.
    const now = new Date();
    const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const start = nextHalfHour(clock);
    setEvent({ date: today, start, end: addMinutesToClock(start, 60) });
    setMode('event');
    setError('');
  }

  async function submit(formData: FormData) {
    setError('');
    if (mode === 'task') {
      await createTask(formData);
      setShowDue(false);
    } else {
      if (!isAfter(event.end, event.start)) {
        setError('The event needs to end after it starts.');
        return;
      }
      formData.set('startTime', `${event.date}T${event.start}`);
      formData.set('endTime', `${event.date}T${event.end}`);
      await addCommitment(formData);
    }
    setTitle('');
    titleRef.current?.focus();
  }

  const modeButton = (value: 'task' | 'event', label: string) => (
    <button
      type="button"
      aria-pressed={mode === value}
      onClick={value === 'event' ? switchToEvent : () => setMode('task')}
      className={`min-h-9 rounded-md px-3.5 text-sm transition focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none ${
        mode === value
          ? 'bg-surface font-semibold text-ink shadow-sm'
          : 'font-medium text-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  );

  return (
    <form
      ref={formRef}
      action={submit}
      aria-label="Quick add"
      className="flex flex-col gap-1"
    >
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2 transition focus-within:border-accent">
        <div
          role="group"
          aria-label="Add a"
          className="flex gap-0.5 rounded-lg bg-subtle p-1"
        >
          {modeButton('task', 'Task')}
          {modeButton('event', 'Event')}
        </div>

        <label htmlFor="quick-add-title" className="sr-only">
          {mode === 'task' ? 'Task title' : 'Event title'}
        </label>
        <input
          ref={titleRef}
          id="quick-add-title"
          name="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            mode === 'task' ? 'What do you need to do?' : "What's on?"
          }
          className="min-h-11 min-w-0 flex-[1_1_220px] bg-transparent px-2 text-[15px] text-ink outline-none placeholder:text-muted"
        />

        {mode === 'task' ? (
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="quick-add-duration" className="sr-only">
              Time estimate
            </label>
            <select
              id="quick-add-duration"
              name="durationEstimate"
              defaultValue="30"
              className={chip}
            >
              {DURATIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {formatDuration(minutes)}
                </option>
              ))}
            </select>

            <label htmlFor="quick-add-priority" className="sr-only">
              Priority
            </label>
            <select
              id="quick-add-priority"
              name="priority"
              defaultValue="2"
              className={chip}
            >
              <option value="1">Low priority</option>
              <option value="2">Medium priority</option>
              <option value="3">High priority</option>
            </select>

            {showDue ? (
              <>
                <label htmlFor="quick-add-due" className="sr-only">
                  Due
                </label>
                <input
                  id="quick-add-due"
                  name="deadline"
                  type="datetime-local"
                  autoFocus
                  className={chip}
                />
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowDue(true)}
                className={`${chip} border-dashed text-muted hover:text-ink`}
              >
                + Due date
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="quick-add-date" className="sr-only">
              Date
            </label>
            <input
              id="quick-add-date"
              type="date"
              required
              min={today}
              value={event.date}
              onChange={(e) => setEvent({ ...event, date: e.target.value })}
              className={chip}
            />
            <label htmlFor="quick-add-start" className="sr-only">
              Starts
            </label>
            <input
              id="quick-add-start"
              type="time"
              required
              value={event.start}
              onChange={(e) =>
                setEvent({
                  ...event,
                  start: e.target.value,
                  // Keep the end after the start when the start moves past it.
                  end: isAfter(event.end, e.target.value)
                    ? event.end
                    : addMinutesToClock(e.target.value, 60),
                })
              }
              className={chip}
            />
            <span className="text-sm text-muted">to</span>
            <label htmlFor="quick-add-end" className="sr-only">
              Ends
            </label>
            <input
              id="quick-add-end"
              type="time"
              required
              value={event.end}
              onChange={(e) => setEvent({ ...event, end: e.target.value })}
              className={chip}
            />
          </div>
        )}

        <button type="submit" className={`${buttonAccent} ml-auto px-5`}>
          Add
        </button>
      </div>

      {error && (
        <p role="alert" className="px-2 text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

/** A button on the timeline that opens the quick-add bar for an event at a set time. */
export function AddEventButton({
  draft,
  label,
  className,
  style,
  children,
}: {
  draft: EventDraft;
  label: string;
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => requestAddEvent(draft)}
      className={className}
      style={style}
    >
      {children}
    </button>
  );
}
