import { formatMinutes } from '@/lib/format';
import type { DailySummary } from '@/lib/analytics/summarize';

const RING_RADIUS = 15;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/**
 * The day so far, at the top of Today: time focused, tasks done (with a ring
 * that fills as they're done) and time still planned.
 */
export function DayStats({ summary }: { summary: DailySummary }) {
  return (
    <section aria-label="Today so far" className="md:max-w-xl">
      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="focused" value={formatMinutes(summary.focusedMinutes)} />
        <Stat
          label="tasks done"
          value={`${summary.completedTasks} of ${summary.plannedTasks}`}
          ring={summary.completionRate}
        />
        <Stat
          label="still planned"
          value={formatMinutes(summary.scheduledMinutes)}
        />
      </dl>
    </section>
  );
}

function Stat({
  label,
  value,
  ring,
}: {
  label: string;
  value: string;
  ring?: number; // Percent
}) {
  // The value shows first, with the label under it; in the markup (and to a
  // screen reader) the label comes first, as a <dl> expects.
  return (
    <div className="flex min-w-0 flex-col-reverse gap-0.5 rounded-xl border border-line bg-surface px-3 py-2.5 shadow-card sm:px-4 sm:py-3">
      <dt className="truncate text-xs text-muted">{label}</dt>
      <dd className="flex items-center gap-2 font-display text-lg font-semibold whitespace-nowrap tabular-nums sm:text-xl">
        {ring !== undefined && <Ring percent={ring} />}
        {value}
      </dd>
    </div>
  );
}

/** Decoration: the number next to it says the same thing. */
function Ring({ percent }: { percent: number }) {
  return (
    <svg
      viewBox="0 0 36 36"
      aria-hidden="true"
      className="hidden h-6 w-6 shrink-0 -rotate-90 sm:block"
    >
      <circle
        cx="18"
        cy="18"
        r={RING_RADIUS}
        fill="none"
        strokeWidth="4"
        className="stroke-subtle"
      />
      <circle
        cx="18"
        cy="18"
        r={RING_RADIUS}
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={RING_LENGTH}
        strokeDashoffset={RING_LENGTH * (1 - percent / 100)}
        className={`stroke-accent motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700 ${percent === 0 ? 'opacity-0' : ''}`}
      />
    </svg>
  );
}
