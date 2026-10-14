import { auth, signIn, signOut } from '@/auth';

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
        <button
          type="submit"
          className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:bg-white"
        >
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
          alt={session.user.name ?? 'User Avatar'}
          className="h-8 w-8 rounded-full border border-slate-700"
        />
      )}
      <span className="text-sm font-medium text-slate-200">
        {session.user.name}
      </span>
      <form
        action={async () => {
          'use server';
          await signOut();
        }}
      >
        <button
          type="submit"
          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}