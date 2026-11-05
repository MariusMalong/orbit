import { auth, signOut } from '@/auth';
import { buttonSecondary } from '@/components/ui-classes';

export async function AuthButton() {
  const session = await auth();

  // Signed-out visitors always land on /signin, which has the sign-in buttons.
  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      {session.user.image && (
        <img
          src={session.user.image}
          alt=""
          className="h-8 w-8 rounded-full border border-line"
        />
      )}
      <span className="text-sm text-muted">{session.user.name}</span>
      {session.user.isDemo && (
        <span className="rounded-full bg-accent-tint px-2 py-0.5 text-xs font-medium">
          Demo
        </span>
      )}
      <form
        action={async () => {
          'use server';
          await signOut();
        }}
      >
        <button type="submit" className={buttonSecondary}>
          Sign out
        </button>
      </form>
    </div>
  );
}
