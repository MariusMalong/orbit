'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Today', icon: <TodayIcon /> },
  { href: '/week', label: 'Week', icon: <WeekIcon /> },
];

/** Hidden on the sign-in page, where there's nothing to switch between. */
function useLinks() {
  const pathname = usePathname();
  if (pathname.startsWith('/signin')) return null;
  return LINKS.map((link) => ({ ...link, isCurrent: pathname === link.href }));
}

/** Today / Week switch in the header, from tablet width up. */
export function MainNav() {
  const links = useLinks();
  if (!links) return null;

  return (
    <nav aria-label="Views" className="hidden gap-1 md:flex">
      {links.map(({ href, label, isCurrent }) => (
        <Link
          key={href}
          href={href}
          aria-current={isCurrent ? 'page' : undefined}
          className={`inline-flex min-h-10 items-center rounded-lg px-3 text-sm transition focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none ${
            isCurrent
              ? 'bg-subtle font-semibold text-ink'
              : 'font-medium text-muted hover:bg-subtle hover:text-ink'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * On a phone, Today and Week are tabs along the bottom of the screen, within
 * reach of a thumb. A spacer the same height keeps the end of the page from
 * hiding behind them.
 */
export function TabBar() {
  const links = useLinks();
  if (!links) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="h-[calc(4rem+env(safe-area-inset-bottom))] md:hidden"
      />
      <nav
        aria-label="Views"
        data-tab-bar
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="mx-auto flex h-16 max-w-md">
          {links.map(({ href, label, icon, isCurrent }) => (
            <Link
              key={href}
              href={href}
              aria-current={isCurrent ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none focus-visible:ring-inset ${
                isCurrent ? 'font-semibold text-ink' : 'font-medium text-muted'
              }`}
            >
              <span
                className={`flex h-7 w-14 items-center justify-center rounded-full ${isCurrent ? 'bg-accent-tint' : ''}`}
              >
                {icon}
              </span>
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

function TodayIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function WeekIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}
