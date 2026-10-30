import { setDayAvailability } from '@/app/actions/availability';

interface WorkdaySettingsProps {
  dayOfWeek: number;
  dayName: string;
  currentStart: string; // "09:00"
  currentEnd: string;   // "17:00"
}

export function WorkdaySettings({ dayOfWeek, dayName, currentStart, currentEnd }: WorkdaySettingsProps) {
  return (
    <form action={setDayAvailability} className="flex items-center justify-between gap-4 rounded-md border border-slate-800 bg-slate-900 p-3">
      <input type="hidden" name="dayOfWeek" value={dayOfWeek} />
      
      <div>
        <span className="text-sm font-medium text-white">{dayName} Hours</span>
        <p className="text-xs text-slate-400">Engine bounds for today</p>
      </div>

      <div className="flex items-center gap-2">
        <input 
          type="time" 
          name="startTime" 
          defaultValue={currentStart} 
          required 
          className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white focus:border-emerald-500 focus:outline-none"
        />
        <span className="text-xs text-slate-500">to</span>
        <input 
          type="time" 
          name="endTime" 
          defaultValue={currentEnd} 
          required 
          className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white focus:border-emerald-500 focus:outline-none"
        />
        <button 
          type="submit" 
          className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
        >
          Update
        </button>
      </div>
    </form>
  );
}