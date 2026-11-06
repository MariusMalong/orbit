'use server';

import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { buildDemoData } from '@/lib/demo/seed';
import {
  clientIp,
  DEMO_LIFETIME_MS,
  DEMO_LIMIT_WINDOW_MS,
  demoLimitReached,
  expiredDemoUsers,
} from '@/lib/demo/limits';
import { getUserTimeZone } from '@/lib/time/user-timezone';

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
  await prisma.user.deleteMany({ where: expiredDemoUsers(now) });

  // Rate limit: per visitor (by a keyed hash of their IP, so the address
  // itself is never stored) and overall. Over a limit, the sign-in page
  // explains instead of creating another account.
  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);
  const ipHash = ip
    ? createHmac('sha256', process.env.AUTH_SECRET ?? '')
        .update(ip)
        .digest('hex')
        .slice(0, 32)
    : null;
  const since = new Date(now.getTime() - DEMO_LIMIT_WINDOW_MS);
  const [fromVisitor, total] = await Promise.all([
    ipHash
      ? prisma.user.count({
          where: {
            isDemo: true,
            demoIpHash: ipHash,
            createdAt: { gte: since },
          },
        })
      : null,
    prisma.user.count({ where: { isDemo: true, createdAt: { gte: since } } }),
  ]);
  if (demoLimitReached({ fromVisitor, total })) {
    redirect('/signin?demo=limited');
  }

  const { availability, tasks, commitments } = buildDemoData(
    now,
    await getUserTimeZone()
  );
  const sessionToken = randomBytes(32).toString('hex');
  const expires = new Date(now.getTime() + DEMO_LIFETIME_MS);

  await prisma.user.create({
    data: {
      name: 'Demo visitor',
      email: `demo-${randomUUID()}@demo.invalid`,
      isDemo: true,
      onboardedAt: now, // The demo comes set up, so it skips /welcome
      demoIpHash: ipHash,
      availabilities: { create: availability },
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
  const secure = requestHeaders.get('x-forwarded-proto') === 'https';
  (await cookies()).set(
    `${secure ? '__Secure-' : ''}authjs.session-token`,
    sessionToken,
    { httpOnly: true, sameSite: 'lax', path: '/', secure, expires }
  );

  redirect('/');
}
