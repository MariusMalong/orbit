'use client';

import { useState } from 'react';
import { completeOnboarding, skipOnboarding } from '@/app/actions/onboarding';
import {
  copyMondayToWorkdays,
  WeekHoursFields,
} from '@/components/working-hours';
import { buttonAccent, fieldInput, panel } from '@/components/ui-classes';
import type { WeekRow } from '@/lib/planning/weekly-hours';
import { STARTER_DURATIONS, STARTER_TASK_COUNT } from '@/lib/onboarding';

const PLACEHOLDERS = [
  'e.g. Finish the project proposal',
  'e.g. Reply to emails',
  'e.g. Book a dentist appointment',
];

function formatDuration(minutes: number) {
  return minutes < 60 ? `${minutes} min` : `${minutes / 60} h`;
}

/** The two setup steps on /welcome: working hours, then a few first tasks. */
export function WelcomeForm({ week }: { week: WeekRow[] }) {
  const [rows, setRows] = useState(week);
  const [error, setError] = useState('');

  return (
    <div className="flex flex-col gap-4">
      <form
        action={async (formData) => {
          setError('');
          const message = await completeOnboarding(formData);
          if (message) setError(message);
        }}
        className="flex flex-col gap-4"
      >
        <section
          aria-labelledby="welcome-hours"
          className={`${panel} flex flex-col gap-3 md:p-6`}
        >
          <div>
            <p className="text-xs font-semibold tracking-wide text-accent uppercase">
              Step 1 of 2
            </p>
            <h2
              id="welcome-hours"
              className="mt-1 font-display text-xl font-semibold"
            >
              When do you work?
            </h2>
            <p className="mt-1 text-sm text-muted">
              Orbit only plans tasks inside these hours. Untick the days you
              don&apos;t work. You can change this any time.
            </p>
          </div>
          <WeekHoursFields rows={rows} onChange={setRows} />
          <button
            type="button"
            onClick={() => setRows(copyMondayToWorkdays)}
            className="min-h-11 cursor-pointer self-start text-sm font-semibold text-accent hover:underline focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
          >
            Copy Monday to all workdays
          </button>
        </section>

        <section
          aria-labelledby="welcome-tasks"
          className={`${panel} flex flex-col gap-3 md:p-6`}
        >
          <div>
            <p className="text-xs font-semibold tracking-wide text-accent uppercase">
              Step 2 of 2
            </p>
            <h2
              id="welcome-tasks"
              className="mt-1 font-display text-xl font-semibold"
            >
              What&apos;s on your plate?
            </h2>
            <p className="mt-1 text-sm text-muted">
              Add a few things you need to get done, with a rough estimate.
              Orbit will fit them into your day. Leave these blank to start
              empty; you can add tasks and events from the next page.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {Array.from({ length: STARTER_TASK_COUNT }, (_, i) => (
              <li key={i} className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
                <label htmlFor={`task-${i}-title`} className="sr-only">
                  Task {i + 1}
                </label>
                <input
                  id={`task-${i}-title`}
                  name={`task-${i}-title`}
                  type="text"
                  placeholder={PLACEHOLDERS[i]}
                  className={fieldInput}
                />
                <label htmlFor={`task-${i}-minutes`} className="sr-only">
                  Task {i + 1} estimate
                </label>
                <select
                  id={`task-${i}-minutes`}
                  name={`task-${i}-minutes`}
                  defaultValue="30"
                  className={fieldInput}
                >
                  {STARTER_DURATIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {formatDuration(minutes)}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </section>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          className={`${buttonAccent} min-h-12 self-stretch text-base sm:self-start sm:px-8`}
        >
          Start planning
        </button>
      </form>

      <form action={skipOnboarding}>
        <button
          type="submit"
          className="min-h-11 cursor-pointer text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
        >
          Skip for now
        </button>
      </form>
    </div>
  );
}
