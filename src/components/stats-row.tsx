import { DailySummary } from '@/lib/analytics/summarize';
import { formatMinutes } from '@/lib/format';

interface StatsRowProps {
  summary: DailySummary;
}

export function StatsRow({ summary }: StatsRowProps) {
  const stats = [
    { label: 'Focused today', value: formatMinutes(summary.focusedMinutes) },
    {
      label: 'Completed',
      value: `${summary.completedTasks} / ${summary.plannedTasks}`,
      suffix: `${summary.completionRate}%`,
    },
    {
      label: 'Still scheduled',
      value: formatMinutes(summary.scheduledMinutes),
    },
  ];

  return (
    <dl className="grid w-full grid-cols-3 rounded-xl border border-line bg-surface sm:w-auto">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={`min-w-0 px-3 py-3 sm:px-5 ${index > 0 ? 'border-l border-line-soft' : ''}`}
        >
          <dt className="text-xs text-muted">{stat.label}</dt>
          <dd className="mt-0.5 font-display text-xl font-semibold tabular-nums sm:text-2xl">
            {stat.value}
            {stat.suffix && (
              <span className="ml-1.5 font-sans text-sm font-medium text-muted">
                {stat.suffix}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
