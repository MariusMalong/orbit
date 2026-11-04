import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { TaskForm } from '@/components/task-form';
import { CommitmentForm } from '@/components/commitment-form';
import { Timeline } from '@/components/timeline';
import { EditTaskModal } from '@/components/edit-task-modal';
import { EditCommitmentModal } from '@/components/edit-commitment-modal';
import { WorkdaySettings } from '@/components/workday-settings';
import { generateSchedule, SchedulableTask, TimeWindow } from '@/lib/engine/scheduler';
import { deleteTask, completeTask } from '@/app/actions/task';
import { deleteCommitment } from '@/app/actions/commitments';
import { FocusTimer } from '@/components/focus-timer';
import { StatsRow } from '@/components/stats-row';
import { summarizeDay } from '@/lib/analytics/summarize';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 - 6

  // 1. Fetch data from database
  // IN_PROGRESS tasks (partially worked via the Focus Timer) still have remaining
  // time, so they must stay in the engine's input alongside untouched TODO tasks.
  const rawTasks = await prisma.task.findMany({
    where: {
      userId: session.user.id,
      status: { in: ['TODO', 'IN_PROGRESS'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rawCommitments = await prisma.fixedCommitment.findMany({
    where: { userId: session.user.id },
    orderBy: { startTime: 'asc' },
  });

  // Fetch Workday Availability for today (or fallback to 09:00 - 17:00)
  const availability = await prisma.availability.findFirst({
    where: {
      userId: session.user.id,
      dayOfWeek: currentDayOfWeek,
    },
  });

  const startTimeStr = availability?.startTime || '09:00';
  const endTimeStr = availability?.endTime || '17:00';

  // Parse availability strings into today's Date objects
  const [startHour, startMin] = startTimeStr.split(':').map(Number);
  const [endHour, endMin] = endTimeStr.split(':').map(Number);

  const workDayStart = new Date(today);
  workDayStart.setHours(startHour, startMin, 0, 0);

  const workDayEnd = new Date(today);
  workDayEnd.setHours(endHour, endMin, 0, 0);

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

  // 3. Run the Scheduling Engine
  const { scheduledBlocks, bumpedTaskIds } = generateSchedule(
    schedulableTasks,
    timeWindows,
    workDayStart,
    workDayEnd
  );

  // 4. Analytics: aggregate today's executed time and task completion
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfToday.getDate() + 1);

  const [todaysEntries, completedTodayCount] = await Promise.all([
    // TimeEntry has no userId column, so ownership is enforced through the
    // parent Task relation. Only entries on this user's tasks can match.
    prisma.timeEntry.findMany({
      where: {
        task: { userId: session.user.id },
        startTime: { gte: startOfToday, lt: startOfTomorrow },
      },
      select: { duration: true },
    }),
    // No completedAt column exists; updatedAt is set by the COMPLETED
    // transition, so it is used as the completion timestamp.
    prisma.task.count({
      where: {
        userId: session.user.id,
        status: 'COMPLETED',
        updatedAt: { gte: startOfToday, lt: startOfTomorrow },
      },
    }),
  ]);

  const summary = summarizeDay({
    focusEntries: todaysEntries,
    completedTaskCount: completedTodayCount,
    activeTaskCount: rawTasks.length,
    scheduledBlocks,
  });

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orbit Workstation</h1>
          <p className="text-sm text-slate-400">Welcome back, {session.user.name}</p>
        </div>
      </header>

      {/* Daily Analytics */}
      <section className="mb-8">
        <StatsRow summary={summary} />
      </section>

      {/* Dynamic Workday Bounds Control */}
      <section className="mb-8">
        <WorkdaySettings 
          dayOfWeek={currentDayOfWeek}
          dayName={DAYS[currentDayOfWeek]}
          currentStart={startTimeStr}
          currentEnd={endTimeStr}
        />
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left Column: Inputs & Raw Lists */}
        <section className="flex flex-col gap-8">
          
          {/* Tasks Section */}
          <div className="flex flex-col gap-4">
            <TaskForm />
            
            {rawTasks.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-slate-400">Active Tasks</h3>
                <ul className="flex flex-col gap-2">
                  {rawTasks.map((task) => (
                    <li key={task.id} className="flex flex-col rounded-md border border-slate-800 bg-slate-900/50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">{task.title}</span>
                          <span className="text-xs text-slate-400">
                            {task.durationEstimate} mins | Priority {task.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <FocusTimer taskId={task.id} />
                          <EditTaskModal task={task} />
                          <form action={completeTask}>
                            <input type="hidden" name="taskId" value={task.id} />
                            <button type="submit" className="text-xs">Complete</button>
                          </form>
                          <form action={deleteTask}>
                            <input type="hidden" name="taskId" value={task.id} />
                            <button type="submit" className="text-xs">Delete</button>
                          </form>
                        </div>
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
            
            {rawCommitments.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-slate-400">Upcoming Commitments</h3>
                <ul className="flex flex-col gap-2">
                  {rawCommitments.map((c) => (
                    <li key={c.id} className="flex flex-col rounded-md border border-slate-800 bg-slate-900/50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">{c.title}</span>
                          <span className="text-xs text-slate-400">
                            {c.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {c.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <EditCommitmentModal commitment={c} />
                          <form action={deleteCommitment}>
                            <input type="hidden" name="commitmentId" value={c.id} />
                            <button type="submit" className="text-xs font-medium text-slate-500 hover:text-red-400">Remove</button>
                          </form>
                        </div>
                      </div>
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