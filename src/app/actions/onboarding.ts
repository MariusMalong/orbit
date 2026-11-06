'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { parseWeeklyHoursForm } from '@/lib/planning/weekly-hours';
import { parseStarterTasks } from '@/lib/onboarding';

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user.id;
}

/**
 * Saves the welcome page: working hours and days off for the week, and any
 * first tasks, then marks the user as set up and opens Today. Returns an
 * error message for the form to show if something isn't valid.
 */
export async function completeOnboarding(
  formData: FormData
): Promise<string | null> {
  const userId = await requireUserId();

  const hours = parseWeeklyHoursForm(formData);
  if ('error' in hours) return hours.error;
  const starter = parseStarterTasks(formData);
  if ('error' in starter) return starter.error;

  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { userId } }),
    prisma.availability.createMany({
      data: hours.rows.map((row) => ({ ...row, userId })),
    }),
    prisma.task.createMany({
      data: starter.tasks.map((task) => ({ ...task, priority: 2, userId })),
    }),
    prisma.user.update({
      where: { id: userId },
      data: { onboardedAt: new Date() },
    }),
  ]);

  revalidatePath('/', 'layout');
  redirect('/');
}

/** "Skip for now": keeps the defaults (09:00–17:00 every day) and opens Today. */
export async function skipOnboarding() {
  const userId = await requireUserId();

  await prisma.user.update({
    where: { id: userId },
    data: { onboardedAt: new Date() },
  });

  revalidatePath('/', 'layout');
  redirect('/');
}
