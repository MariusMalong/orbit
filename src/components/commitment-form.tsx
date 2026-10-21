import { addCommitment } from '@/app/actions/commitments';

export function CommitmentForm() {
  return (
    <form action={addCommitment} className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white">Add Fixed Commitment</h2>
      <p className="text-sm text-slate-400">Events the scheduler cannot move (e.g., Lectures).</p>
      
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium text-slate-400">Event Title</label>
        <input 
          type="text" 
          name="title" 
          required 
          placeholder="e.g., Computer Networks Lecture"
          className="rounded-md border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none" 
        />
      </div>

      <div className="flex gap-4">
        <div className="flex w-1/2 flex-col gap-2">
          <label htmlFor="startTime" className="text-sm font-medium text-slate-400">Start Time</label>
          <input 
            type="datetime-local" 
            name="startTime" 
            required 
            className="rounded-md border border-slate-700 bg-slate-950 p-2.5 text-white focus:border-emerald-500 focus:outline-none" 
          />
        </div>

        <div className="flex w-1/2 flex-col gap-2">
          <label htmlFor="endTime" className="text-sm font-medium text-slate-400">End Time</label>
          <input 
            type="datetime-local" 
            name="endTime" 
            required 
            className="rounded-md border border-slate-700 bg-slate-950 p-2.5 text-white focus:border-emerald-500 focus:outline-none" 
          />
        </div>
      </div>

      <button 
        type="submit" 
        className="mt-2 rounded-md bg-slate-800 border border-slate-700 px-4 py-2.5 font-medium text-white transition hover:bg-slate-700"
      >
        Save Commitment
      </button>
    </form>
  );
}