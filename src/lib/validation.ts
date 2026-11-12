// Checks on what the forms send, run by the server actions before anything
// is saved. The browser checks most of this too (required fields, a minimum
// of one minute), but a request can be sent without the page, so the server
// can't rely on it.
//
// Each parser returns the clean value, or an error message to show.

export const MAX_TITLE_LENGTH = 200;
/** A task can be big (it's spread over several days), but not endless. */
export const MAX_TASK_MINUTES = 100 * 60;
/** An event can run over several days, up to a week. */
export const MAX_EVENT_MS = 7 * 24 * 60 * 60_000;

export type Parsed<T> = { value: T } | { error: string };

export function parseTitle(value: unknown): Parsed<string> {
  const title = typeof value === 'string' ? value.trim() : '';
  if (!title) return { error: 'Give it a title.' };
  if (title.length > MAX_TITLE_LENGTH) {
    return { error: `Keep the title under ${MAX_TITLE_LENGTH} characters.` };
  }
  return { value: title };
}

export function parseTaskMinutes(value: unknown): Parsed<number> {
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < 1) {
    return { error: 'The time estimate needs to be at least a minute.' };
  }
  if (minutes > MAX_TASK_MINUTES) {
    return {
      error: `Keep the estimate under ${MAX_TASK_MINUTES / 60} hours, or split the task up.`,
    };
  }
  return { value: minutes };
}

/** 1 (low), 2 (medium) or 3 (high). */
export function parsePriority(value: unknown): Parsed<number> {
  const priority = Number(value);
  return [1, 2, 3].includes(priority)
    ? { value: priority }
    : { error: 'Choose a priority.' };
}

export function checkEventTimes(
  start: Date,
  end: Date
): { error: string } | null {
  if (end <= start) return { error: 'The event needs to end after it starts.' };
  if (end.getTime() - start.getTime() > MAX_EVENT_MS) {
    return { error: 'An event can be up to a week long.' };
  }
  return null;
}

/** The fields every task has: title, estimate and priority. */
export function parseTaskFields(
  formData: FormData
): Parsed<{ title: string; durationEstimate: number; priority: number }> {
  const title = parseTitle(formData.get('title'));
  if ('error' in title) return title;
  const minutes = parseTaskMinutes(formData.get('durationEstimate'));
  if ('error' in minutes) return minutes;
  const priority = parsePriority(formData.get('priority'));
  if ('error' in priority) return priority;
  return {
    value: {
      title: title.value,
      durationEstimate: minutes.value,
      priority: priority.value,
    },
  };
}
