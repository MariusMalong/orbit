'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function createTask(formData: FormData) {
  // 1. Verify the user's identity securely on the server
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('You must be logged in to create a task.');
  }

  // 2. Extract the values submitted from the frontend form
  const title = formData.get('title') as string;
  const durationEstimate = Number(formData.get('durationEstimate'));
  const priority = Number(formData.get('priority'));

  // 3. Write the new task to PostgreSQL
  await prisma.task.create({
    data: {
      title: title,
      durationEstimate: durationEstimate,
      priority: priority,
      userId: session.user.id,
    },
  });

  // 4. Tell Next.js to refresh the dashboard so the new task appears
  revalidatePath('/');
}

export async function deleteTask(formData: FormData) {
  // 1. Verify identity
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('You must be logged in to delete a task.');
  }

  // 2. Extract the Task ID from the frontend form
  const taskId = formData.get('taskId') as string;

  // 3. Securely delete the task
  await prisma.task.deleteMany({
    where: {
      id: taskId,
      userId: session.user.id, // CRITICAL SECURITY CHECK
    },
  });

  // 4. Refresh the dashboard
  revalidatePath('/');
}