import { setDayAvailability } from '@/app/actions/availability';
import { buttonSecondary } from '@/components/ui-classes';

interface WorkdaySettingsProps {
  dayOfWeek: number;
  dayName: string;
  currentStart: string; // "09:00"
  currentEnd: string;   // "17:00"
}

const timeInput =
  'min-h-10 rounded-lg border border-line bg-surface px-2 text-sm text-ink tabular-nums ' +
  'focus:border-ink focus:outline-none focus:ring-2 focus:ring-accent/40';

export function WorkdaySettings({ dayOfWeek, dayName, currentStart, currentEnd }: WorkdaySettingsProps) {
  return (
    <form action={setDayAvailability} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="dayOfWeek" value={dayOfWeek} />

      <label htmlFor="workday-start" className="text-sm text-muted">
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
      <span className="text-sm text-muted" aria-hidden="true">to</span>
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
      <button type="submit" className={buttonSecondary}>
        Update
      </button>
    </form>
  );
}
