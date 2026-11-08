// Projects group tasks under a name and a colour. The colour is stored as one
// of these keys; each maps to a CSS variable (see globals.css) with a light
// and a dark value, so a project looks right in both themes.

export const PROJECT_COLORS = [
  'teal',
  'blue',
  'violet',
  'rose',
  'amber',
  'green',
] as const;
export type ProjectColor = (typeof PROJECT_COLORS)[number];

export const PROJECT_COLOR_NAMES: Record<ProjectColor, string> = {
  teal: 'Teal',
  blue: 'Blue',
  violet: 'Violet',
  rose: 'Rose',
  amber: 'Amber',
  green: 'Green',
};

// Written out in full so Tailwind finds every class.
const DOT: Record<ProjectColor, string> = {
  teal: 'bg-project-teal',
  blue: 'bg-project-blue',
  violet: 'bg-project-violet',
  rose: 'bg-project-rose',
  amber: 'bg-project-amber',
  green: 'bg-project-green',
};
const STRIPE: Record<ProjectColor, string> = {
  teal: 'shadow-[inset_3px_0_0_var(--color-project-teal)]',
  blue: 'shadow-[inset_3px_0_0_var(--color-project-blue)]',
  violet: 'shadow-[inset_3px_0_0_var(--color-project-violet)]',
  rose: 'shadow-[inset_3px_0_0_var(--color-project-rose)]',
  amber: 'shadow-[inset_3px_0_0_var(--color-project-amber)]',
  green: 'shadow-[inset_3px_0_0_var(--color-project-green)]',
};
/** The stripe on a task block with no project. */
const DEFAULT_STRIPE = 'shadow-[inset_3px_0_0_var(--color-accent-edge)]';

export type ProjectInfo = { id: string; name: string; color: ProjectColor };

export const MAX_PROJECT_NAME_LENGTH = 40;

/** A stored colour, or teal for anything unknown. */
export function parseProjectColor(value: unknown): ProjectColor {
  return PROJECT_COLORS.includes(value as ProjectColor)
    ? (value as ProjectColor)
    : 'teal';
}

/** A project name as typed, trimmed; null if it's empty or too long. */
export function parseProjectName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  return name.length > 0 && name.length <= MAX_PROJECT_NAME_LENGTH
    ? name
    : null;
}

/** The first colour not used yet, so new projects look different. */
export function nextProjectColor(used: ProjectColor[]): ProjectColor {
  return (
    PROJECT_COLORS.find((c) => !used.includes(c)) ??
    PROJECT_COLORS[used.length % PROJECT_COLORS.length]
  );
}

export const projectDot = (color: ProjectColor) => DOT[color];
export const blockStripe = (color: ProjectColor | null | undefined) =>
  color ? STRIPE[color] : DEFAULT_STRIPE;

/**
 * Planned minutes per project, in the projects' order, with tasks that have
 * no project last (as `project: null`). Projects with nothing planned are
 * left out.
 */
export function plannedByProject(
  blocks: { taskId: string; startTime: Date; endTime: Date }[],
  projects: ProjectInfo[],
  projectOf: Record<string, ProjectInfo>
): { project: ProjectInfo | null; minutes: number }[] {
  const minutes = new Map<string | null, number>();
  for (const b of blocks) {
    const key = projectOf[b.taskId]?.id ?? null;
    const length = Math.round(
      (b.endTime.getTime() - b.startTime.getTime()) / 60_000
    );
    minutes.set(key, (minutes.get(key) ?? 0) + length);
  }
  return [...projects, null]
    .map((project) => ({
      project,
      minutes: minutes.get(project?.id ?? null) ?? 0,
    }))
    .filter((row) => row.minutes > 0);
}
