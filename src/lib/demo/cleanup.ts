import 'server-only';
import { prisma } from '@/lib/prisma';
import { expiredDemoUsers } from '@/lib/demo/limits';

/**
 * Deletes demo accounts whose 24 hours are up. Deleting a user cascades to
 * their tasks, events, projects, time entries and sessions. Returns how many
 * accounts went.
 *
 * Runs every day from a Vercel Cron job (api/cron/cleanup-demos), and each
 * time someone starts a demo.
 */
export async function deleteExpiredDemos(now = new Date()) {
  const { count } = await prisma.user.deleteMany({
    where: expiredDemoUsers(now),
  });
  return count;
}
