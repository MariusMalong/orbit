import { PRIORITY_LABELS } from '@/lib/format';
import { DAY_NAMES } from '@/lib/planning/weekly-hours';

// "Download my data": everything the user has put into Orbit, as JSON.
//
// Fields are copied one by one rather than spread from the database rows, so
// nothing is exported by accident: sign-in tokens, sessions and the demo IP
// hash are left out, because they're secrets or meaningless outside Orbit.

export const EXPORT_VERSION = 1;

export type ExportInput = {
  user: {
    name: string | null;
    email: string;
    image: string | null;
    isDemo: boolean;
    createdAt: Date;
    accounts: { provider: string }[];
  };
  availabilities: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isDayOff: boolean;
  }[];
  projects: { id: string; name: string; color: string | null }[];
  tasks: {
    id: string;
    title: string;
    description: string | null;
    priority: number;
    durationEstimate: number;
    deadline: Date | null;
    plannedStart: Date | null;
    status: string;
    completedAt: Date | null;
    createdAt: Date;
    projectId: string | null;
    timeEntries: {
      startTime: Date;
      endTime: Date | null;
      duration: number | null;
    }[];
  }[];
  commitments: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    repeatsWeekly: boolean;
    skippedStarts: Date[];
  }[];
};

export function buildExport(data: ExportInput, exportedAt: Date) {
  const projectName = new Map(data.projects.map((p) => [p.id, p.name]));

  return {
    format: 'orbit-export',
    version: EXPORT_VERSION,
    exportedAt: exportedAt.toISOString(),
    account: {
      name: data.user.name,
      email: data.user.email,
      image: data.user.image,
      demo: data.user.isDemo,
      createdAt: data.user.createdAt.toISOString(),
      signsInWith: data.user.accounts.map((a) => a.provider),
    },
    workingHours: [...data.availabilities]
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      .map((a) => ({
        day: DAY_NAMES[a.dayOfWeek],
        start: a.startTime,
        end: a.endTime,
        dayOff: a.isDayOff,
      })),
    projects: data.projects.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
    })),
    tasks: data.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: PRIORITY_LABELS[t.priority] ?? String(t.priority),
      minutesLeft: t.durationEstimate,
      status: t.status.toLowerCase().replace('_', ' '),
      deadline: t.deadline?.toISOString() ?? null,
      plannedStart: t.plannedStart?.toISOString() ?? null,
      project: t.projectId ? (projectName.get(t.projectId) ?? null) : null,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString() ?? null,
      timeLogged: t.timeEntries.map((e) => ({
        start: e.startTime.toISOString(),
        end: e.endTime?.toISOString() ?? null,
        minutes: e.duration,
      })),
    })),
    events: data.commitments.map((c) => ({
      id: c.id,
      title: c.title,
      start: c.startTime.toISOString(),
      end: c.endTime.toISOString(),
      repeatsWeekly: c.repeatsWeekly,
      skippedWeeks: c.skippedStarts.map((d) => d.toISOString()),
    })),
  };
}

/** "orbit-export-2026-11-08.json", dated in the user's timezone. */
export function exportFileName(dateKey: string): string {
  return `orbit-export-${dateKey}.json`;
}
