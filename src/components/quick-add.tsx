'use client';

import { ProjectSelect } from '@/components/projects-context';
import { useEffect, useId, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { createTask } from '@/app/actions/task';
import { addCommitment } from '@/app/actions/commitments';
import { buttonAccent, fieldInput } from '@/components/ui-classes';
import { addMinutesToClock, isAfter, nextHalfHour } from '@/lib/time/clock';

/** Times for a new event, as date and time inputs expect them. */
export type EventDraft = {
  date: string; // "2026-11-06"
  start: string; // "14:00"
  end: string; // "15:00"
};

const ADD_EVENT = 'orbit:add-event';

/**
 * Opens the quick-add bar (or the add sheet, on a phone) in event mode with
 * these times filled in. Used by the timeline's hour labels and free slots.
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

/** Whether an element is on screen (not inside something display: none). */
const isShown = (element: Element | null) =>
  !!element && element.getClientRects().length > 0;

interface QuickAddProps {
  today: string; // Today's date in the visitor's timezone, "2026-11-06"
}

/**
 * Adding tasks and events. From tablet width up it's a bar at the top of the
 * page; on a phone it's a floating + button that opens the same form in a
 * sheet from the bottom of the screen, near the thumb.
 */
export function QuickAdd({ today }: QuickAddProps) {
  return (
    <>
      <div className="hidden md:block">
        <QuickAddForm today={today} variant="bar" />
      </div>
      <AddSheet today={today} />
    </>
  );
}

function AddSheet({ today }: QuickAddProps) {
  // Null while closed; the event to fill in when the timeline opened it.
  const [open, setOpen] = useState<{ event?: EventDraft } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // On a phone, a tap on the timeline's free time opens the sheet.
  useEffect(() => {
    const handleAddEvent = (e: Event) => {
      if (!isShown(buttonRef.current)) return;
      setOpen({ event: (e as CustomEvent<EventDraft>).detail });
    };
    window.addEventListener(ADD_EVENT, handleAddEvent);
    return () => window.removeEventListener(ADD_EVENT, handleAddEvent);
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Add a task or event"
        title="Add a task or event"
        onClick={() => setOpen({})}
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg transition hover:bg-accent-hover focus-visible:ring-4 focus-visible:ring-accent/40 focus-visible:outline-none md:hidden"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <Dialog
        open={open !== null}
        onClose={() => setOpen(null)}
        labelledBy="add-sheet-title"
        sheet
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2
            id="add-sheet-title"
            className="font-display text-lg font-semibold text-ink"
          >
            Add
          </h2>
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted hover:bg-subtle hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
          >
            Cancel
          </button>
        </div>
        <QuickAddForm
          today={today}
          variant="sheet"
          initialEvent={open?.event}
          onAdded={() => setOpen(null)}
        />
      </Dialog>
    </>
  );
}

interface QuickAddFormProps extends QuickAddProps {
  variant: 'bar' | 'sheet';
  /** Start in event mode with these times. */
  initialEvent?: EventDraft;
  /** After something's been added. */
  onAdded?: () => void;
}

/**
 * One form for adding both tasks and events. Tasks need a title, an estimate
 * and a priority; events a title and a time.
 */
function QuickAddForm({
  today,
  variant,
  initialEvent,
  onAdded,
}: QuickAddFormProps) {
  const [mode, setMode] = useState<'task' | 'event'>(
    initialEvent ? 'event' : 'task'
  );
  const [title, setTitle] = useState('');
  const [showDue, setShowDue] = useState(false);
  const [event, setEvent] = useState<EventDraft>(
    initialEvent ?? { date: today, start: '09:00', end: '10:00' }
  );
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const isSheet = variant === 'sheet';

  // A click on the timeline asks for an event at a particular time. (On a
  // phone the bar is hidden, and the sheet answers instead.)
  useEffect(() => {
    if (isSheet) return;
    const handleAddEvent = (e: Event) => {
      if (!isShown(formRef.current)) return;
      setMode('event');
      setEvent((e as CustomEvent<EventDraft>).detail);
      setError('');
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      titleRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener(ADD_EVENT, handleAddEvent);
    return () => window.removeEventListener(ADD_EVENT, handleAddEvent);
  }, [isSheet]);

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
    if (onAdded) onAdded();
    else titleRef.current?.focus();
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
      <div
        className={
          isSheet
            ? 'flex flex-col items-stretch gap-3'
            : 'flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2 transition focus-within:border-accent'
        }
      >
        <div
          role="group"
          aria-label="Add a"
          className={`flex gap-0.5 rounded-lg bg-subtle p-1 ${isSheet ? '[&>button]:flex-1' : ''}`}
        >
          {modeButton('task', 'Task')}
          {modeButton('event', 'Event')}
        </div>

        <label htmlFor={`${id}-title`} className="sr-only">
          {mode === 'task' ? 'Task title' : 'Event title'}
        </label>
        <input
          ref={titleRef}
          id={`${id}-title`}
          name="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            mode === 'task' ? 'What do you need to do?' : "What's on?"
          }
          data-autofocus={isSheet || undefined}
          className={
            isSheet
              ? `${fieldInput} text-base`
              : 'min-h-11 min-w-0 flex-[1_1_220px] bg-transparent px-2 text-[15px] text-ink outline-none placeholder:text-muted'
          }
        />

        {mode === 'task' ? (
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={`${id}-duration`} className="sr-only">
              Time estimate
            </label>
            <select
              id={`${id}-duration`}
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

            <label htmlFor={`${id}-priority`} className="sr-only">
              Priority
            </label>
            <select
              id={`${id}-priority`}
              name="priority"
              defaultValue="2"
              className={chip}
            >
              <option value="1">Low priority</option>
              <option value="2">Medium priority</option>
              <option value="3">High priority</option>
            </select>

            <ProjectSelect id={`${id}-project`} hideLabel className={chip} />

            {showDue ? (
              <>
                <label htmlFor={`${id}-due`} className="sr-only">
                  Due
                </label>
                <input
                  id={`${id}-due`}
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
            <label htmlFor={`${id}-date`} className="sr-only">
              Date
            </label>
            <input
              id={`${id}-date`}
              type="date"
              required
              min={today}
              value={event.date}
              onChange={(e) => setEvent({ ...event, date: e.target.value })}
              className={chip}
            />
            <label htmlFor={`${id}-start`} className="sr-only">
              Starts
            </label>
            <input
              id={`${id}-start`}
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
            <label htmlFor={`${id}-end`} className="sr-only">
              Ends
            </label>
            <input
              id={`${id}-end`}
              type="time"
              required
              value={event.end}
              onChange={(e) => setEvent({ ...event, end: e.target.value })}
              className={chip}
            />
            <label
              className={`${chip} inline-flex cursor-pointer items-center gap-2 has-[:checked]:border-accent has-[:checked]:font-medium`}
            >
              <input
                type="checkbox"
                name="repeatsWeekly"
                className="h-4 w-4 accent-accent"
              />
              Every week
            </label>
          </div>
        )}

        <button
          type="submit"
          className={`${buttonAccent} px-5 ${isSheet ? 'w-full' : 'ml-auto'}`}
        >
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
  label?: string; // Only when the visible text alone isn't enough
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
