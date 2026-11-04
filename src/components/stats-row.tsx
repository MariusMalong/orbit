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
    <dl className="flex flex-wrap rounded-xl border border-line bg-surface">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={`px-5 py-3 ${index > 0 ? 'border-l border-line-soft' : ''}`}
        >
          <dt className="text-xs text-muted">{stat.label}</dt>
          <dd className="mt-0.5 font-display text-2xl font-semibold tabular-nums">
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
