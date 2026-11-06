import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';
import { startDemo } from '@/app/actions/demo';
import { buttonAccent, buttonSecondary, panel } from '@/components/ui-classes';

export const metadata: Metadata = {
  title: 'Orbit | Sign in',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect('/');
  }
  const demoLimited = (await searchParams).demo === 'limited';

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-8 py-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Plan your day around what can&apos;t move
        </h1>
        <p className="mt-3 text-ink-2">
          Orbit takes your tasks, your fixed commitments and the hours you want
          to work, and builds the day&apos;s plan for you. When something
          changes, the plan is redrawn.
        </p>
      </div>

      <div className={`${panel} flex flex-col gap-4 md:p-6`}>
        <div className="flex flex-col gap-2">
          {demoLimited && (
            <p
              role="status"
              className="rounded-lg border border-warning-line bg-warning-bg px-3 py-2.5 text-sm text-warning-ink"
            >
              Lots of demos have been started recently, so new ones are paused
              for a little while. Please try again in an hour, or sign in with
              GitHub.
            </p>
          )}
          <form action={startDemo}>
            <button type="submit" className={`${buttonAccent} w-full`}>
              Try the demo
            </button>
          </form>
          <p className="text-sm text-muted">
            Opens a temporary account with sample tasks and commitments. No
            sign-up needed, and it&apos;s deleted after 24 hours.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <form
          action={async () => {
            'use server';
            await signIn('github', { redirectTo: '/' });
          }}
        >
          <button type="submit" className={`${buttonSecondary} w-full`}>
            Sign in with GitHub
          </button>
        </form>
      </div>
    </div>
  );
}
