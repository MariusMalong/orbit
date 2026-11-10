import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { Popover } from '@/components/popover';
import { ThemeToggle } from '@/components/theme-toggle';
import { buttonSecondary } from '@/components/ui-classes';
import type { Theme } from '@/lib/theme';

const menuRow =
  'flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-ink transition hover:bg-subtle focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none';

/**
 * The right-hand side of the header: the theme switch, and who's signed in.
 *
 * On a phone there's room for one row, so the account link, theme switch and
 * Sign out go in a menu instead.
 */
export async function HeaderAccount({ theme }: { theme: Theme }) {
  const session = await auth();
  const user = session?.user;

  // Signed-out visitors always land on /signin, which has the sign-in buttons.
  if (!user) return <ThemeToggle initialTheme={theme} />;

  const avatar = (size: string) =>
    user.image ? (
      <img
        src={user.image}
        alt=""
        className={`${size} rounded-full border border-line`}
      />
    ) : null;

  const signOutForm = (className: string) => (
    <form
      action={async () => {
        'use server';
        await signOut();
      }}
    >
      <button type="submit" className={className}>
        Sign out
      </button>
    </form>
  );

  // One row: on a phone the Demo badge and a menu; from tablet width up, the
  // theme switch, the account link and Sign out, either side of the badge.
  return (
    <div className="flex items-center gap-2 md:gap-3">
      <div className="hidden md:contents">
        <ThemeToggle initialTheme={theme} />
        {avatar('h-8 w-8')}
        <Link
          href="/account"
          className="rounded text-sm text-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
        >
          {user.name}
          <span className="sr-only"> (account)</span>
        </Link>
      </div>
      {user.isDemo && (
        <span className="rounded-full bg-accent-tint px-2 py-0.5 text-xs font-medium">
          Demo
        </span>
      )}
      <div className="hidden md:contents">{signOutForm(buttonSecondary)}</div>

      <div className="md:hidden">
        <Popover
          triggerClassName="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-subtle px-2 text-sm font-medium text-ink transition hover:border-muted focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
          trigger={
            <>
              {avatar('h-7 w-7')}
              <MenuIcon />
              <span className="pr-1">Menu</span>
            </>
          }
        >
          <p className="truncate px-3 pt-1.5 pb-1 text-xs text-muted">
            Signed in as {user.name}
          </p>
          <Link href="/account" data-close className={menuRow}>
            Account
          </Link>
          <ThemeToggle initialTheme={theme} variant="menu" />
          {signOutForm(menuRow)}
        </Popover>
      </div>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
