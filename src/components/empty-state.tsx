import { AddTaskButton } from '@/components/quick-add';

type Picture = 'orbit' | 'done' | 'rest';

interface EmptyStateProps {
  picture: Picture;
  title: string;
  children: React.ReactNode;
  /** Show an "Add a task" button, which opens the add form. */
  addTask?: boolean;
  className?: string;
}

/** What a panel shows when there's nothing in it yet, and what to do next. */
export function EmptyState({
  picture,
  title,
  children,
  addTask = false,
  className = 'flex',
}: EmptyStateProps) {
  return (
    <div
      className={`${className} flex-col items-center gap-2 px-4 py-6 text-center`}
    >
      <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-accent-tint text-accent">
        <PictureIcon picture={picture} />
      </div>
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      <p className="max-w-xs text-sm text-muted">{children}</p>
      {addTask && <AddTaskButton />}
    </div>
  );
}

function PictureIcon({ picture }: { picture: Picture }) {
  const common = {
    width: 28,
    height: 28,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  } as const;

  if (picture === 'done') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5l2.5 2.5L16 9.5" />
      </svg>
    );
  }
  if (picture === 'rest') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  // An orbit with a planet on it, like the logo.
  return (
    <svg {...common}>
      <ellipse
        cx="12"
        cy="12"
        rx="9.5"
        ry="4.5"
        transform="rotate(-20 12 12)"
      />
      <circle cx="12" cy="12" r="3" />
      <circle cx="20" cy="8.6" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
