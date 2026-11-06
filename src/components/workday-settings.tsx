import { setDayAvailability } from '@/app/actions/availability';
import { buttonSecondary } from '@/components/ui-classes';

interface WorkdaySettingsProps {
  dayOfWeek: number;
  dayName: string;
  currentStart: string; // "09:00"
  currentEnd: string; // "17:00"
}

// On phones the controls stretch to fill each row, but never shrink below
// their natural width (that would hide "am"/"pm"), so Update moves to its own
// row when it doesn't fit. From sm up everything keeps its natural width.
const timeInput =
  'min-h-10 flex-1 rounded-lg border border-line bg-surface px-2 text-sm text-ink tabular-nums sm:flex-none ' +
  'focus:border-ink focus:outline-none focus:ring-2 focus:ring-accent/40';

export function WorkdaySettings({
  dayOfWeek,
  dayName,
  currentStart,
  currentEnd,
}: WorkdaySettingsProps) {
  return (
    <form
      action={setDayAvailability}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="dayOfWeek" value={dayOfWeek} />

      <label
        htmlFor="workday-start"
        className="basis-full text-sm text-muted sm:basis-auto"
      >
        {dayName} hours
      </label>
      <input
        type="time"
        name="startTime"
        id="workday-start"
        defaultValue={currentStart}
        required
        className={timeInput}
      />
      <span className="text-sm text-muted" aria-hidden="true">
        to
      </span>
      <label htmlFor="workday-end" className="sr-only">
        {dayName} end time
      </label>
      <input
        type="time"
        name="endTime"
        id="workday-end"
        defaultValue={currentEnd}
        required
        className={timeInput}
      />
      <button
        type="submit"
        className={`${buttonSecondary} flex-1 sm:flex-none`}
      >
        Update
      </button>
    </form>
  );
}
