'use client';

import { useState } from 'react';
import { updateTask } from '@/app/actions/task';

interface EditTaskProps {
  task: {
    id: string;
    title: string;
    durationEstimate: number;
    priority: number;
  };
}

export function EditTaskModal({ task }: EditTaskProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)} 
        className="text-xs font-medium text-slate-400 hover:text-amber-400"
      >
        Edit
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-slate-700 bg-slate-950 p-3">
      <form 
        action={async (formData) => {
          await updateTask(formData);
          setIsOpen(false);
        }} 
        className="flex flex-col gap-3"
      >
        <input type="hidden" name="taskId" value={task.id} />
        
        <div>
          <label className="text-xs font-medium text-slate-400">Task Title</label>
          <input 
            type="text" 
            name="title" 
            defaultValue={task.title} 
            required 
            className="w-full rounded border border-slate-800 bg-slate-900 p-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex gap-2">
          <div className="w-1/2">
            <label className="text-xs font-medium text-slate-400">Duration (Mins)</label>
            <input 
              type="number" 
              name="durationEstimate" 
              defaultValue={task.durationEstimate} 
              required 
              className="w-full rounded border border-slate-800 bg-slate-900 p-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="w-1/2">
            <label className="text-xs font-medium text-slate-400">Priority</label>
            <select 
              name="priority" 
              defaultValue={task.priority} 
              className="w-full rounded border border-slate-800 bg-slate-900 p-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value={1}>1 - Low</option>
              <option value={2}>2 - Medium</option>
              <option value={3}>3 - High</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button 
            type="button" 
            onClick={() => setIsOpen(false)} 
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="rounded bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/30"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}