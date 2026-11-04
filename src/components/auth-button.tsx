import { auth, signIn, signOut } from '@/auth';
import { buttonPrimary, buttonSecondary } from '@/components/ui-classes';

export async function AuthButton() {
  const session = await auth();

  if (!session?.user) {
    return (
      <form
        action={async () => {
          'use server';
          await signIn('github');
        }}
      >
        <button type="submit" className={buttonPrimary}>
          Sign in with GitHub
        </button>
      </form>
    );
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
