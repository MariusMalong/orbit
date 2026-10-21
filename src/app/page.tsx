import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { TaskForm } from '@/components/task-form';
import { deleteTask, completeTask } from '@/app/actions/task';
import { CommitmentForm } from '@/components/commitment-form';
import { deleteCommitment } from '@/app/actions/commitments';

export default async function Home() {
  const session = await auth();

  // If logged out, show the placeholder screen
  if (!session?.user) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Today</h1>
          <p className="text-slate-400">Your schedule will appear here.</p>
        </header>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Authentication required to view tasks.</p>
        </div>
      </div>
    );
  }

  // Fetch tasks for the currently logged-in user
  const tasks = await prisma.task.findMany({
    where: { 
      userId: session.user.id,
      status: 'TODO' // Only fetch active tasks
    },
    orderBy: { createdAt: 'desc' },
  });

  const commitments = await prisma.fixedCommitment.findMany({
    where: { userId: session.user.id },
    orderBy: { startTime: 'asc'},
  });

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {session.user.name}</h1>
        <p className="text-slate-400">Let&apos;s get your day in motion.</p>
      </header>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Left Column: Inputs */}
        <section className="flex flex-col gap-8">
          <TaskForm />

          <div className="flex flex-col gap-4">
            <CommitmentForm />

            {/* List of Commitments */}
            {commitments.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-slate-400">Upcoming Commitments</h3>
                <ul className="flex flex-col gap-2">
                  {commitments.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/50 p-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">{c.title}</span>
                        <span className="text-xs text-slate-400">
                          {c.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {c.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}
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

        {/* Right Column: Task Feed */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-white">Your Tasks Feed</h2>
          
          {tasks.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-center">
              <p className="text-sm text-slate-400">No tasks yet. Create one to get started!</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-4 transition hover:border-slate-700">
                  <div className="flex flex-col">
                    <span className="font-medium text-white">{task.title}</span>
                    <span className="text-sm text-slate-400">{task.durationEstimate} minutes</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs font-medium text-slate-300">
                      Priority {task.priority}
                    </span>

                    <form action={completeTask}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button
                        type="submit"
                        className="text-sm font-medium text-emerald-500 transition hover:text-emerald-400"
                        title="Mark as completed"
                      >
                        Complete
                      </button>
                    </form>

                    <form action={deleteTask}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button
                        type="submit"
                        className="text-sm font-medium text-slate-500 transition hover:text-red-400"
                        title="Delete task"
                      >
                        Delete
                      </button>
                    </form>
                    
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}