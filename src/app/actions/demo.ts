'use server';

import { randomBytes, randomUUID } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { buildDemoData } from '@/lib/demo/seed';

// Demo accounts, and their sessions, last this long.
const DEMO_LIFETIME_MS = 24 * 60 * 60 * 1000;

/**
 * "Try the demo": creates a temporary account filled with sample data and
 * signs the visitor in to it. Every visitor gets their own account, so nobody
 * sees anyone else's changes.
 *
 * Orbit uses Auth.js database sessions, so signing in is just a Session row
 * plus the cookie Auth.js reads. From then on, auth() treats the demo user like
 * any other user, and every query stays scoped to their own user ID.
 */
export async function startDemo() {
  const now = new Date();

  // Clean up demo accounts older than a day. Deleting the user cascades to
  // their tasks, commitments, time entries and sessions.
  await prisma.user.deleteMany({
    where: {
      isDemo: true,
      createdAt: { lt: new Date(now.getTime() - DEMO_LIFETIME_MS) },
    },
  });

  const { tasks, commitments } = buildDemoData(now);
  const sessionToken = randomBytes(32).toString('hex');
  const expires = new Date(now.getTime() + DEMO_LIFETIME_MS);

  await prisma.user.create({
    data: {
      name: 'Demo visitor',
      email: `demo-${randomUUID()}@demo.invalid`,
      isDemo: true,
      commitments: { create: commitments },
      tasks: {
        create: tasks.map(({ timeEntries, ...task }) => ({
          ...task,
          timeEntries: { create: timeEntries },
        })),
      },
      sessions: { create: { sessionToken, expires } },
    },
  });

  // Same cookie name and options Auth.js uses: the __Secure- prefix and the
  // secure flag are only set over HTTPS, so local http://localhost still works.
  const secure = (await headers()).get('x-forwarded-proto') === 'https';
  (await cookies()).set(
    `${secure ? '__Secure-' : ''}authjs.session-token`,
    sessionToken,
    { httpOnly: true, sameSite: 'lax', path: '/', secure, expires }
  );

  redirect('/');
}
