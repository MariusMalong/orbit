import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { DeleteAccount } from '@/components/delete-account';
import { buttonSecondary, panel, panelTitle } from '@/components/ui-classes';

export const metadata: Metadata = {
  title: 'Account | Orbit',
};

const PROVIDER_NAMES: Record<string, string> = {
  github: 'GitHub',
  google: 'Google',
};

/** Who you're signed in as, and the button to delete everything. */
export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/signin');
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      isDemo: true,
      accounts: { select: { provider: true } },
    },
  });
  const providers = user.accounts.map(
    (a) => PROVIDER_NAMES[a.provider] ?? a.provider
  );

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Account
      </h1>

      <section aria-labelledby="profile-heading" className={panel}>
        <h2 id="profile-heading" className={panelTitle}>
          Signed in as
        </h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted">Name</dt>
          <dd>{user.name ?? '—'}</dd>
          <dt className="text-muted">Email</dt>
          <dd className="break-all">{user.email ?? '—'}</dd>
          <dt className="text-muted">Signs in with</dt>
          <dd>
            {user.isDemo
              ? 'Demo account: it closes after 24 hours and is then deleted'
              : providers.join(' and ') || '—'}
          </dd>
        </dl>
      </section>

      <section
        aria-labelledby="export-heading"
        className={`${panel} flex flex-col gap-3`}
      >
        <h2 id="export-heading" className={panelTitle}>
          Your data
        </h2>
        <p className="text-sm text-ink-2">
          Download everything you&apos;ve put into Orbit as a JSON file: your
          tasks and the time logged on them, events, projects and working hours.
        </p>
        <a
          href="/account/export"
          download
          className={`${buttonSecondary} self-start`}
        >
          Download my data
        </a>
      </section>

      <section
        aria-labelledby="delete-heading"
        className={`${panel} flex flex-col gap-3`}
      >
        <h2 id="delete-heading" className={panelTitle}>
          Delete your account
        </h2>
        <p className="text-sm text-ink-2">
          Removes your account and everything in it: tasks, events, working
          hours and logged time. Nothing is kept. See the{' '}
          <Link
            href="/privacy"
            className="font-medium text-ink underline decoration-accent underline-offset-2"
          >
            privacy policy
          </Link>{' '}
          for what Orbit stores.
        </p>
        <DeleteAccount />
      </section>
    </div>
  );
}
