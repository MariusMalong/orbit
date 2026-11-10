// Shared Tailwind class strings for the Tide design language (see globals.css).
// Kept as plain strings (not components) so server and client components can both use them.

export const panel = 'rounded-xl border border-line bg-surface p-5 shadow-card';

export const panelTitle = 'font-display text-base font-semibold text-ink';

export const fieldLabel = 'flex flex-col gap-1 text-sm font-medium text-ink';

export const fieldInput =
  'min-h-11 w-full min-w-0 rounded-lg border border-line bg-surface px-3 font-normal text-ink ' +
  'placeholder:text-muted/80 focus:border-ink focus:outline-none focus:ring-2 focus:ring-accent/40';

const buttonBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition motion-safe:active:scale-[0.98] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-60';

export const buttonPrimary = `${buttonBase} bg-primary text-on-primary hover:bg-primary-hover`;

export const buttonAccent = `${buttonBase} bg-accent font-semibold text-on-accent hover:bg-accent-hover`;

export const buttonSecondary = `${buttonBase} border border-line bg-surface text-ink hover:bg-subtle`;

export const iconButtonDanger =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line bg-surface text-danger ' +
  'transition hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60';

export const buttonDanger = `${buttonBase} border border-danger bg-surface font-semibold text-danger hover:bg-subtle`;
