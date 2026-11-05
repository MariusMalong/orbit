import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  pages: {
    // Our own page, with the "Try the demo" button next to GitHub sign-in
    signIn: '/signin',
  },
  callbacks: {
    // Ensure the User ID is attached to the session object
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.isDemo = user.isDemo;
      }
      return session;
    },
  },
});
