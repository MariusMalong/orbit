import { DailySummary } from '@/lib/analytics/summarize';

interface StatsRowProps {
  summary: DailySummary;
}

// Display-only formatting: the data layer stays in integer minutes.
function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

export function StatsRow({ summary }: StatsRowProps) {
  const stats = [
    {
      label: 'Focused Today',
      value: formatMinutes(summary.focusedMinutes),
      detail: 'Logged via Focus Timer',
    },
    {
      label: 'Tasks Completed',
      value: `${summary.completedTasks} / ${summary.plannedTasks}`,
      detail: `${summary.completionRate}% of today's workload`,
    },
    {
      label: 'Still Scheduled',
      value: formatMinutes(summary.scheduledMinutes),
      detail: 'Remaining on the timeline',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-900 p-4"
        >
          <span className="text-xs font-medium text-slate-400">{stat.label}</span>
          <span className="text-2xl font-semibold text-white tabular-nums">{stat.value}</span>
          <span className="text-xs text-slate-500">{stat.detail}</span>
        </div>
      ))}
    </div>
  );
}
