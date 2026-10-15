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