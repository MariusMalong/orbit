'use client';

import { useState } from 'react';
import { updateCommitment } from '@/app/actions/commitments';

interface EditCommitmentProps {
  commitment: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
  };
}

export function EditCommitmentModal({ commitment }: EditCommitmentProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Helper to format Date into datetime-local input string (YYYY-MM-DDTHH:mm)
  const formatForInput = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

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
          await updateCommitment(formData);
          setIsOpen(false);
        }} 
        className="flex flex-col gap-3"
      >
        <input type="hidden" name="commitmentId" value={commitment.id} />
        
        <div>
          <label className="text-xs font-medium text-slate-400">Event Title</label>
          <input 
            type="text" 
            name="title" 
            defaultValue={commitment.title} 
            required 
            className="w-full rounded border border-slate-800 bg-slate-900 p-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex gap-2">
          <div className="w-1/2">
            <label className="text-xs font-medium text-slate-400">Start Time</label>
            <input 
              type="datetime-local" 
              name="startTime" 
              defaultValue={formatForInput(new Date(commitment.startTime))} 
              required 
              className="w-full rounded border border-slate-800 bg-slate-900 p-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="w-1/2">
            <label className="text-xs font-medium text-slate-400">End Time</label>
            <input 
              type="datetime-local" 
              name="endTime" 
              defaultValue={formatForInput(new Date(commitment.endTime))} 
              required 
              className="w-full rounded border border-slate-800 bg-slate-900 p-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
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