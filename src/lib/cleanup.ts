import 'server-only';
import { prisma } from '@/lib/prisma';
import { expiredDemoUsers } from '@/lib/demo/limits';

/** Deleted tasks can be brought back (Undo) for this long, then they're purged. */
export const UNDO_DELETE_MS = 24 * 60 * 60 * 1000;

/**
 * Deletes demo accounts whose 24 hours are up. Deleting a user cascades to
 * their tasks, events, projects, time entries and sessions. Returns how many
 * accounts went. Runs each time someone starts a demo, and every day.
 */
export async function deleteExpiredDemos(now = new Date()) {
  const { count } = await prisma.user.deleteMany({
    where: expiredDemoUsers(now),
  });
  return count;
}

/**
 * Deletes for good the tasks deleted more than a day ago (Delete only marks
 * them, so it can be undone). Their time entries go with them.
 */
export async function purgeDeletedTasks(now = new Date()) {
  const { count } = await prisma.task.deleteMany({
    where: { deletedAt: { lt: new Date(now.getTime() - UNDO_DELETE_MS) } },
  });
  return count;
}
