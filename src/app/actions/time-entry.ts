'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function logTimeEntry(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const taskId = formData.get('taskId') as string;
  const durationMinutes = parseInt(
    formData.get('durationMinutes') as string,
    10
  );
  const startTime = new Date(formData.get('startTime') as string);
  const endTime = new Date(formData.get('endTime') as string);

  // 1. TimeEntry has no userId, so verify ownership through the parent task first
  const task = await prisma.task.findUnique({
    where: { id: taskId, userId: session.user.id },
  });

  if (!task) {
    throw new Error('Task not found or unauthorized');
  }

  // 2. Record the focus session
  await prisma.timeEntry.create({
    data: {
      taskId,
      duration: durationMinutes,
      startTime,
      endTime,
    },
  });

  // 3. Subtract the time worked from the estimate (floor at 0)
  const newEstimate = Math.max(0, task.durationEstimate - durationMinutes);
  const isDone = newEstimate === 0;

  await prisma.task.update({
    where: { id: taskId },
    data: {
      durationEstimate: newEstimate,
      status: isDone ? 'COMPLETED' : 'IN_PROGRESS',
      completedAt: isDone ? endTime : null,
    },
  });

  // Re-render the dashboard so the schedule uses the new estimate
  revalidatePath('/');
}
