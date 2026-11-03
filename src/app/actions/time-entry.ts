'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function logTimeEntry(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const taskId = formData.get('taskId') as string;
  const durationMinutes = parseInt(formData.get('durationMinutes') as string, 10);
  const startTime = new Date(formData.get('startTime') as string);
  const endTime = new Date(formData.get('endTime') as string);

  // 1. Fetch the task FIRST to verify you own it (Strict data isolation)
  const task = await prisma.task.findUnique({
    where: { id: taskId, userId: session.user.id },
  });

  if (!task) {
    throw new Error('Task not found or unauthorized');
  }

  // 2. Create the audit log matching your exact Prisma schema
  await prisma.timeEntry.create({
    data: {
      taskId,
      duration: durationMinutes, // Mapped to 'duration' to match your schema
      startTime,
      endTime,
    },
  });

  // 3. Subtract the time worked from the estimate (floor at 0)
  const newEstimate = Math.max(0, task.durationEstimate - durationMinutes);
  
  await prisma.task.update({
    where: { id: taskId },
    data: {
      durationEstimate: newEstimate,
      status: newEstimate === 0 ? 'COMPLETED' : 'IN_PROGRESS',
    },
  });

  // Recalculate the dashboard timeline based on the new reality
  revalidatePath('/');
}