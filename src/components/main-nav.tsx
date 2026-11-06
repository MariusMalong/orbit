'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Today' },
  { href: '/week', label: 'Week' },
];

/** Today / Week switch in the header. Hidden on the sign-in page. */
export function MainNav() {
  const pathname = usePathname();
  if (pathname.startsWith('/signin')) return null;

  return (
    <nav aria-label="Views" className="flex gap-1">
      {LINKS.map(({ href, label }) => {
        const isCurrent = pathname === href;
        return (
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
        );
      })}
    </nav>
  );
}
