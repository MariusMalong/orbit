import 'server-only';
import { prisma } from '@/lib/prisma';
import { afterFocus, focusMinutes } from '@/lib/focus';

// The focus timer's database side. Not a 'use server' file on purpose: every
// export there becomes an action the browser can call with any arguments, and
// these take a userId, so they must only be called by code that has already
// checked who's signed in.
//
// A running timer is a TimeEntry with no endTime. TimeEntry has no userId
// column, so every query reaches the user through the entry's task.

/** The user's running timer, if any. */
export async function findRunningFocus(userId: string) {
  return prisma.timeEntry.findFirst({
    where: { endTime: null, task: { userId } },
    select: { id: true, taskId: true, startTime: true },
  });
}

/**
 * Stops the user's running timer, if there is one, and logs the time on its
 * task: it comes off the estimate, and at zero the task is done.
 */
export async function stopRunningFocus(userId: string, now: Date) {
  const running = await prisma.timeEntry.findFirst({
    where: { endTime: null, task: { userId } },
    include: { task: true },
  });
  if (!running) return;

  const minutes = focusMinutes(running.startTime, now);
  const { minutesLeft, isDone } = afterFocus(
    running.task.durationEstimate,
    minutes
  );
  await prisma.$transaction([
    prisma.timeEntry.update({
      where: { id: running.id },
      data: {
        // A capped session ends when the cap ran out, not now.
        endTime: new Date(running.startTime.getTime() + minutes * 60_000),
        duration: minutes,
      },
    }),
    // A task already marked done keeps its status; only its time is logged.
    ...(running.task.status === 'COMPLETED'
      ? []
      : [
          prisma.task.update({
            where: { id: running.taskId },
            data: {
              durationEstimate: minutesLeft,
              status: isDone ? 'COMPLETED' : 'IN_PROGRESS',
              completedAt: isDone ? now : null,
            },
          }),
        ]),
  ]);
}

/** For other actions (like marking a task done) that end a running timer. */
export async function stopFocusFor(userId: string, taskId: string) {
  const running = await findRunningFocus(userId);
  if (running?.taskId === taskId) await stopRunningFocus(userId, new Date());
}
