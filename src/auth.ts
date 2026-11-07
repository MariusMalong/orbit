import NextAuth from 'next-auth';
import type { Provider } from 'next-auth/providers';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

/**
 * Google sign-in is offered only when its OAuth client is configured, so a
 * local setup with just a GitHub app keeps working.
 */
export const googleEnabled = !!(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

const providers: Provider[] = [
  GitHub({
    clientId: process.env.AUTH_GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET,
  }),
];
if (googleEnabled) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  pages: {
    // Our own page, with the "Try the demo" button next to the sign-in
    // buttons. Sign-in errors are shown there too.
    signIn: '/signin',
    error: '/signin',
  },
  callbacks: {
    // Ensure the User ID is attached to the session object
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.isDemo = user.isDemo;
        session.user.onboarded = !!user.onboardedAt;
      }
      return session;
    },
  },
});
