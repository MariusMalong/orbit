import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { buildExport, exportFileName } from '@/lib/export';
import { getUserTimeZone } from '@/lib/time/user-timezone';
import { toDateKey } from '@/lib/time/clock';

/**
 * "Download my data" on the Account page: the signed-in user's data as a
 * JSON file. Every query is scoped to the session's user, and `select` lists
 * exactly the columns needed, so tokens and sessions are never read.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Sign in to download your data.', { status: 401 });
  }
  const userId = session.user.id;

  const [user, availabilities, projects, tasks, commitments] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          image: true,
          isDemo: true,
          createdAt: true,
          accounts: { select: { provider: true } },
        },
      }),
      prisma.availability.findMany({
        where: { userId },
        select: {
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          isDayOff: true,
        },
      }),
      prisma.project.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, color: true },
      }),
      prisma.task.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          priority: true,
          durationEstimate: true,
          deadline: true,
          plannedStart: true,
          status: true,
          completedAt: true,
          createdAt: true,
          projectId: true,
          timeEntries: {
            orderBy: { startTime: 'asc' },
            select: { startTime: true, endTime: true, duration: true },
          },
        },
      }),
      prisma.fixedCommitment.findMany({
        where: { userId },
        orderBy: { startTime: 'asc' },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          repeatsWeekly: true,
          skippedStarts: true,
        },
      }),
    ]);

  const now = new Date();
  const body = buildExport(
    { user, availabilities, projects, tasks, commitments },
    now
  );
  const fileName = exportFileName(toDateKey(now, await getUserTimeZone()));

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
