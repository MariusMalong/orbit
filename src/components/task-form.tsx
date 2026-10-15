import { createTask } from '@/app/actions/task';

export function TaskForm() {
  return (
    <form action={createTask} className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white">Add a New Task</h2>
      
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium text-slate-400">Task Title</label>
        <input 
          type="text" 
          name="title" 
          id="title" 
          required 
          placeholder="e.g., Write Database Schema"
          className="rounded-md border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" 
        />
      </div>

      <div className="flex gap-4">
        <div className="flex w-1/2 flex-col gap-2">
          <label htmlFor="durationEstimate" className="text-sm font-medium text-slate-400">Duration (Mins)</label>
          <input 
            type="number" 
            name="durationEstimate" 
            id="durationEstimate" 
            required 
            min="1" 
            placeholder="90"
            className="rounded-md border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" 
          />
        </div>

        <div className="flex w-1/2 flex-col gap-2">
          <label htmlFor="priority" className="text-sm font-medium text-slate-400">Priority</label>
          <select 
            name="priority" 
            id="priority" 
            className="rounded-md border border-slate-700 bg-slate-950 p-2.5 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="1">1 - Low</option>
            <option value="2">2 - Medium</option>
            <option value="3">3 - High</option>
          </select>
        </div>
      </div>

      <button 
        type="submit" 
        className="mt-2 rounded-md bg-emerald-600 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-500"
      >
        Create Task
      </button>
    </form>
  );
}