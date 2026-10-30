import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { TaskForm } from '@/components/task-form';
import { CommitmentForm } from '@/components/commitment-form';
import { Timeline } from '@/components/timeline';
import { generateSchedule, SchedulableTask, TimeWindow } from '@/lib/engine/scheduler';
import { deleteTask, completeTask } from '@/app/actions/task';
import { deleteCommitment } from '@/app/actions/commitments';

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  // 1. Fetch raw data from database
  const rawTasks = await prisma.task.findMany({
    where: { 
      userId: session.user.id,
      status: 'TODO'
    },
    orderBy: { createdAt: 'desc' },
  });

  const rawCommitments = await prisma.fixedCommitment.findMany({
    where: { userId: session.user.id },
    orderBy: { startTime: 'asc' },
  });

  // 2. Map Prisma data to Engine types
  const schedulableTasks: SchedulableTask[] = rawTasks.map((t) => ({
    id: t.id,
    title: t.title,
    durationEstimate: t.durationEstimate,
    priority: t.priority,
  }));

  const timeWindows: TimeWindow[] = rawCommitments.map((c) => ({
    start: c.startTime,
    end: c.endTime,
  }));

  // 3. Define default workday bounds (e.g., Today 9:00 AM to 5:00 PM)
  const today = new Date();
  const workDayStart = new Date(today);
  workDayStart.setHours(9, 0, 0, 0);

  const workDayEnd = new Date(today);
  workDayEnd.setHours(17, 0, 0, 0);

  // 4. Run the Scheduling Engine
  const { scheduledBlocks, bumpedTaskIds } = generateSchedule(
    schedulableTasks,
    timeWindows,
    workDayStart,
    workDayEnd
  );

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orbit Workstation</h1>
          <p className="text-sm text-slate-400">Welcome back, {session.user.name}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left Column: Inputs & Raw Lists */}
        <section className="flex flex-col gap-8">
          
          {/* Tasks Section */}
          <div className="flex flex-col gap-4">
            <TaskForm />
            
            {/* Active Tasks List */}
            {rawTasks.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-slate-400">Active Tasks</h3>
                <ul className="flex flex-col gap-2">
                  {rawTasks.map((task) => (
                    <li key={task.id} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/50 p-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">{task.title}</span>
                        <span className="text-xs text-slate-400">
                          {task.durationEstimate} mins | Priority {task.priority}
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <form action={completeTask}>
                          <input type="hidden" name="taskId" value={task.id} />
                          <button type="submit" className="text-xs font-medium text-emerald-500 hover:text-emerald-400">Complete</button>
                        </form>
                        <form action={deleteTask}>
                          <input type="hidden" name="taskId" value={task.id} />
                          <button type="submit" className="text-xs font-medium text-slate-500 hover:text-red-400">Delete</button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* Commitments Section */}
          <div className="flex flex-col gap-4">
            <CommitmentForm />
            
            {/* List of Commitments */}
            {rawCommitments.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-slate-400">Upcoming Commitments</h3>
                <ul className="flex flex-col gap-2">
                  {rawCommitments.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/50 p-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">{c.title}</span>
                        <span className="text-xs text-slate-400">
                          {c.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {c.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <form action={deleteCommitment}>
                        <input type="hidden" name="commitmentId" value={c.id} />
                        <button type="submit" className="text-xs font-medium text-slate-500 hover:text-red-400">Remove</button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Engine Generated Timeline */}
        <section>
          <Timeline 
            scheduledBlocks={scheduledBlocks} 
            bumpedTaskIds={bumpedTaskIds} 
            tasks={schedulableTasks} 
          />
        </section>
      </div>
    </main>
  );
}