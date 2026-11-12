'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { stopRunningFocus } from '@/lib/focus-store';

// The focus timer lives in the database: starting it creates a TimeEntry with
// no endTime, and stopping it fills that in. So a running timer survives
// going to the Week page, a reload, or opening Orbit on another device, and
// the time worked is measured by the server's clock, not sent by the browser.
// The database side is in lib/focus-store.ts.

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

/** Starts the timer on a task, stopping and logging any other one first. */
export async function startFocus(formData: FormData) {
  const userId = await requireUserId();
  const taskId = formData.get('taskId') as string;
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId, status: { not: 'COMPLETED' } },
    select: { id: true },
  });
  if (!task) throw new Error('Task not found.');

  const now = new Date();
  await stopRunningFocus(userId, now);
  await prisma.timeEntry.create({ data: { taskId, startTime: now } });
  revalidatePath('/', 'layout');
}

/** Stops the running timer and logs the time worked. */
export async function stopFocus() {
  const userId = await requireUserId();
  await stopRunningFocus(userId, new Date());
  revalidatePath('/', 'layout');
}
