import { ScheduleBlockResult, SchedulableTask } from '@/lib/engine/scheduler';

interface TimelineProps {
  scheduledBlocks: ScheduleBlockResult[];
  bumpedTaskIds: string[];
  tasks: SchedulableTask[];
}

export function Timeline({ scheduledBlocks, bumpedTaskIds, tasks }: TimelineProps) {
  // Quick lookup map to resolve task titles and priorities by ID
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const bumpedTasks = bumpedTaskIds.map((id) => taskMap.get(id)).filter(Boolean) as SchedulableTask[];

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Generated Plan Today</h2>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
          Deterministic
        </span>
      </div>

      {/* Bumped Tasks Alert */}
      {bumpedTasks.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4">
          <h3 className="text-sm font-medium text-amber-400">⚠️ Spillover Warning</h3>
          <p className="mt-1 text-xs text-amber-300/80">
            The following tasks exceeded your workday bounds and could not be scheduled today:
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {bumpedTasks.map((task) => (
              <li key={task.id} className="text-xs text-amber-200 font-mono">
                • {task.title} ({task.durationEstimate} mins)
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Scheduled Time Blocks */}
      {scheduledBlocks.length === 0 ? (
        <p className="text-sm text-slate-500">No tasks scheduled yet. Add tasks and commitments to see your generated plan.</p>
      ) : (
        <div className="relative flex flex-col gap-3 border-l-2 border-slate-800 pl-4">
          {scheduledBlocks.map((block, index) => {
            const task = taskMap.get(block.taskId);
            if (!task) return null;

            const startTimeStr = block.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const endTimeStr = block.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div 
                key={`${block.taskId}-${index}`} 
                className="relative flex flex-col gap-1 rounded-md border border-slate-800 bg-slate-950 p-3 shadow-sm"
              >
                {/* Visual indicator node on the timeline line */}
                <div className="absolute -left-[21px] top-4 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-slate-900" />
                
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-emerald-400">
                    {startTimeStr} - {endTimeStr}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    Priority {task.priority}
                  </span>
                </div>
                
                <h4 className="text-sm font-medium text-white">{task.title}</h4>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}