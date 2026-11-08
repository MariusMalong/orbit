'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { getUserTimeZone } from '@/lib/time/user-timezone';
import { parseDateTimeLocal } from '@/lib/time/zoned';

// The optional "Due" field: empty means no deadline. Like commitments, the
// datetime-local value is a wall-clock time in the visitor's timezone.
async function readDeadline(formData: FormData): Promise<Date | null> {
  const value = (formData.get('deadline') as string | null)?.trim();
  if (!value) return null;
  const deadline = parseDateTimeLocal(value, await getUserTimeZone());
  if (!deadline) throw new Error('Invalid due date.');
  return deadline;
}

// The optional "Start at" field: empty lets Orbit plan the task.
async function readPlannedStart(formData: FormData): Promise<Date | null> {
  const value = (formData.get('plannedStart') as string | null)?.trim();
  if (!value) return null;
  const start = parseDateTimeLocal(value, await getUserTimeZone());
  if (!start) throw new Error('Invalid start time.');
  return start;
}

// The optional project. Only one of the user's own projects can be set, so
// a forged id from someone else's account is quietly ignored.
async function readProjectId(
  formData: FormData,
  userId: string
): Promise<string | null> {
  const value = (formData.get('projectId') as string | null)?.trim();
  if (!value) return null;
  const project = await prisma.project.findFirst({
    where: { id: value, userId },
    select: { id: true },
  });
  return project?.id ?? null;
}

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
  const deadline = await readDeadline(formData);
  const projectId = await readProjectId(formData, session.user.id);

  // 3. Write the new task to PostgreSQL
  await prisma.task.create({
    data: {
      title: title,
      durationEstimate: durationEstimate,
      priority: priority,
      deadline,
      projectId,
      userId: session.user.id,
    },
  });

  // 4. Tell Next.js to refresh the dashboard so the new task appears
  revalidatePath('/', 'layout');
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
      userId: session.user.id, // Only delete tasks owned by this user
    },
  });

  // 4. Refresh the dashboard
  revalidatePath('/', 'layout');
}

export async function completeTask(formData: FormData) {
  // 1. Verify identity
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('You must be logged in to update a task.');
  }

  // 2. Extract Task ID
  const taskId = formData.get('taskId') as string;

  // 3. Securely update the task status
  await prisma.task.updateMany({
    where: {
      id: taskId,
      userId: session.user.id,
    },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  // 4. Refresh the dashboard
  revalidatePath('/', 'layout');
}

export async function updateTask(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const taskId = formData.get('taskId') as string;
  const title = formData.get('title') as string;
  const durationEstimate = parseInt(
    formData.get('durationEstimate') as string,
    10
  );
  const priority = parseInt(formData.get('priority') as string, 10);
  const deadline = await readDeadline(formData);
  const plannedStart = await readPlannedStart(formData);
  const projectId = await readProjectId(formData, session.user.id);

  await prisma.task.updateMany({
    where: {
      id: taskId,
      userId: session.user.id, // Strict data isolation
    },
    data: {
      title,
      durationEstimate,
      priority,
      deadline,
      plannedStart,
      projectId,
    },
  });

  revalidatePath('/', 'layout');
}

/**
 * Places a task at a time (from dragging it on the timeline or the Week
 * board), or, with an empty `plannedStart`, hands it back to Orbit to plan.
 * `plannedStart` is an ISO timestamp, since the drag already knows the
 * exact instant.
 */
export async function placeTask(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const taskId = formData.get('taskId') as string;
  const value = (formData.get('plannedStart') as string | null)?.trim();
  const plannedStart = value ? new Date(value) : null;
  if (plannedStart && Number.isNaN(plannedStart.getTime())) {
    throw new Error('Invalid start time.');
  }

  await prisma.task.updateMany({
    where: { id: taskId, userId: session.user.id },
    data: { plannedStart },
  });

  revalidatePath('/', 'layout');
}
