'use client';

import { useState } from 'react';
import { saveWeeklyHours } from '@/app/actions/availability';
import { Dialog } from '@/components/dialog';
import { buttonPrimary, buttonSecondary } from '@/components/ui-classes';
import { DAY_NAMES, type WeekRow } from '@/lib/planning/weekly-hours';

interface WorkingHoursProps {
  week: WeekRow[]; // All seven days, Monday first
  label: string; // Accessible name for the button
  trigger: React.ReactNode; // What the button shows
  triggerClassName: string;
}

const timeInput =
  'min-h-10 rounded-lg border border-line bg-surface px-2 text-sm text-ink tabular-nums ' +
  'focus:border-ink focus:outline-none focus:ring-2 focus:ring-accent/40';

/**
 * A button that opens the working-hours editor: one row per day with its
 * hours, and a checkbox to make it a day off.
 */
export function WorkingHours({
  week,
  label,
  trigger,
  triggerClassName,
}: WorkingHoursProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rows, setRows] = useState(week);
  const [error, setError] = useState('');

  function open() {
    // Start from what's saved, not from an earlier unsaved edit.
    setRows(week);
    setError('');
    setIsOpen(true);
  }

  const update = (dayOfWeek: number, change: Partial<WeekRow>) =>
    setRows((current) =>
      current.map((row) =>
        row.dayOfWeek === dayOfWeek ? { ...row, ...change } : row
      )
    );

  function copyMonday() {
    const monday = rows.find((row) => row.dayOfWeek === 1);
    if (!monday) return;
    setRows((current) =>
      current.map((row) =>
        row.isDayOff
          ? row
          : { ...row, startTime: monday.startTime, endTime: monday.endTime }
      )
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={label}
        className={triggerClassName}
      >
        {trigger}
      </button>

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        labelledBy="working-hours-heading"
        wide
      >
        <h2
          id="working-hours-heading"
          className="font-display text-lg font-semibold"
        >
          Working hours
        </h2>
        <p className="mt-1 text-sm text-muted">
          Orbit only plans tasks inside these hours. Untick a day to take it
          off, and nothing gets planned on it.
        </p>

        <form
          action={async (formData) => {
            const message = await saveWeeklyHours(formData);
            if (message) setError(message);
            else setIsOpen(false);
          }}
          className="mt-4 flex flex-col gap-4"
        >
          <ul>
            {rows.map((row) => {
              const name = DAY_NAMES[row.dayOfWeek];
              const id = `day-${row.dayOfWeek}`;
              return (
                <li
                  key={row.dayOfWeek}
                  className="flex min-h-13 flex-wrap items-center gap-x-3 gap-y-1 border-t border-line-soft py-1.5 first:border-t-0"
                >
                  <label
                    htmlFor={`${id}-on`}
                    className="flex w-32 cursor-pointer items-center gap-2.5 font-medium"
                  >
                    <input
                      id={`${id}-on`}
                      name={`${id}-on`}
                      type="checkbox"
                      checked={!row.isDayOff}
                      onChange={(e) =>
                        update(row.dayOfWeek, { isDayOff: !e.target.checked })
                      }
                      className="h-5 w-5 accent-accent"
                    />
                    {name}
                  </label>

                  {row.isDayOff ? (
                    <>
                      <span className="text-sm text-muted">Day off</span>
                      {/* Kept, so switching the day back on restores them. */}
                      <input
                        type="hidden"
                        name={`${id}-start`}
                        value={row.startTime}
                      />
                      <input
                        type="hidden"
                        name={`${id}-end`}
                        value={row.endTime}
                      />
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <label htmlFor={`${id}-start`} className="sr-only">
                        {name} start
                      </label>
                      <input
                        id={`${id}-start`}
                        name={`${id}-start`}
                        type="time"
                        required
                        value={row.startTime}
                        onChange={(e) =>
                          update(row.dayOfWeek, { startTime: e.target.value })
                        }
                        className={timeInput}
                      />
                      <span className="text-sm text-muted">to</span>
                      <label htmlFor={`${id}-end`} className="sr-only">
                        {name} end
                      </label>
                      <input
                        id={`${id}-end`}
                        name={`${id}-end`}
                        type="time"
                        required
                        value={row.endTime}
                        onChange={(e) =>
                          update(row.dayOfWeek, { endTime: e.target.value })
                        }
                        className={timeInput}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={copyMonday}
              className="min-h-11 cursor-pointer text-sm font-semibold text-accent hover:underline focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
            >
              Copy Monday to all workdays
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={buttonSecondary}
              >
                Cancel
              </button>
              <button type="submit" className={buttonPrimary}>
                Save hours
              </button>
            </div>
          </div>
        </form>
      </Dialog>
    </>
  );
}
