// The welcome page's "first tasks" fields: up to STARTER_TASK_COUNT rows of
// `task-<n>-title` and `task-<n>-minutes`. Blank rows are left out.

export const STARTER_TASK_COUNT = 3;

export const STARTER_DURATIONS = [15, 30, 45, 60, 90, 120];

export type StarterTask = { title: string; durationEstimate: number };

const MAX_MINUTES = 24 * 60;

export function parseStarterTasks(
  formData: FormData
): { tasks: StarterTask[] } | { error: string } {
  const tasks: StarterTask[] = [];

  for (let i = 0; i < STARTER_TASK_COUNT; i++) {
    const title = String(formData.get(`task-${i}-title`) ?? '').trim();
    if (!title) continue;

    const minutes = Number(formData.get(`task-${i}-minutes`));
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_MINUTES) {
      return { error: `"${title}" needs a time estimate.` };
    }
    tasks.push({ title, durationEstimate: minutes });
  }

  return { tasks };
}
