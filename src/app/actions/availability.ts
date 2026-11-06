'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function setDayAvailability(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const dayOfWeek = parseInt(formData.get('dayOfWeek') as string, 10); // 0 (Sun) - 6 (Sat)
  const startTime = formData.get('startTime') as string; // e.g., "09:00"
  const endTime = formData.get('endTime') as string; // e.g., "17:00"

  // Upsert availability for this specific day of week
  const existing = await prisma.availability.findFirst({
    where: {
      userId: session.user.id,
      dayOfWeek,
    },
  });

  if (existing) {
    await prisma.availability.update({
      where: { id: existing.id },
      data: { startTime, endTime },
    });
  } else {
    await prisma.availability.create({
      data: {
        userId: session.user.id,
        dayOfWeek,
        startTime,
        endTime,
      },
    });
  }

  revalidatePath('/', 'layout');
}
