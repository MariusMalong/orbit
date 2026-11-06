'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { parseWeeklyHoursForm } from '@/lib/planning/weekly-hours';

/**
 * Saves working hours and days off for the whole week at once. Returns an
 * error message for the form to show, or null when it's saved.
 */
export async function saveWeeklyHours(
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  const userId = session.user.id;

  const parsed = parseWeeklyHoursForm(formData);
  if ('error' in parsed) return parsed.error;

  // Replace the user's seven rows in one transaction, so a failed save never
  // leaves the week half updated.
  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { userId } }),
    prisma.availability.createMany({
      data: parsed.rows.map((row) => ({ ...row, userId })),
    }),
  ]);

  revalidatePath('/', 'layout');
  return null;
}
