import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth, googleEnabled, signIn } from '@/auth';
import { startDemo } from '@/app/actions/demo';
import { buttonAccent, buttonSecondary, panel } from '@/components/ui-classes';

export const metadata: Metadata = {
  title: 'Orbit | Sign in',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; error?: string; deleted?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect('/');
  }
  const params = await searchParams;
  const demoLimited = params.demo === 'limited';
  const deleted = params.deleted === '1';
  const error = params.error ? signInErrorMessage(params.error) : null;

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
          {deleted && (
            <p
              role="status"
              className="rounded-lg border border-line bg-subtle px-3 py-2.5 text-sm text-ink-2"
            >
              Your account and everything in it have been deleted.
            </p>
          )}
          {demoLimited && (
            <p
              role="status"
              className="rounded-lg border border-warning-line bg-warning-bg px-3 py-2.5 text-sm text-warning-ink"
            >
              Lots of demos have been started recently, so new ones are paused
              for a little while. Please try again in an hour, or sign in
              instead.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-warning-line bg-warning-bg px-3 py-2.5 text-sm text-warning-ink"
            >
              {error}
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

        <div className="flex flex-col gap-2">
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
          {googleEnabled && (
            <form
              action={async () => {
                'use server';
                await signIn('google', { redirectTo: '/' });
              }}
            >
              <button type="submit" className={`${buttonSecondary} w-full`}>
                Sign in with Google
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/** What went wrong, for the error codes Auth.js sends back to this page. */
function signInErrorMessage(code: string): string {
  switch (code) {
    case 'OAuthAccountNotLinked':
      return 'That email address is already used by an Orbit account that signs in another way. Sign in the way you did before.';
    case 'AccessDenied':
      return 'Sign-in was cancelled.';
    default:
      return 'Something went wrong while signing in. Please try again.';
  }
}
