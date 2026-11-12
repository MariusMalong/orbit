'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { getUserTimeZone } from '@/lib/time/user-timezone';
import { parseDateTimeLocal } from '@/lib/time/zoned';
import { stopFocusFor } from '@/lib/focus-store';
import { parseTaskFields } from '@/lib/validation';

// An optional date and time field, like "Due" or "Start at": empty is null.
// Like commitments, the datetime-local value is a wall-clock time in the
// visitor's timezone. Undefined means it couldn't be read.
async function readOptionalTime(
  formData: FormData,
  name: string
): Promise<Date | null | undefined> {
  const value = (formData.get(name) as string | null)?.trim();
  if (!value) return null;
  return parseDateTimeLocal(value, await getUserTimeZone()) ?? undefined;
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

/** Adds a task. Returns an error message for the form, or null when it's saved. */
export async function createTask(formData: FormData): Promise<string | null> {
  // 1. Verify the user's identity securely on the server
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('You must be logged in to create a task.');
  }

  // 2. Check the values submitted from the form (see lib/validation.ts)
  const fields = parseTaskFields(formData);
  if ('error' in fields) return fields.error;
  const deadline = await readOptionalTime(formData, 'deadline');
  if (deadline === undefined) return "The due date isn't a valid date.";
  const projectId = await readProjectId(formData, session.user.id);

  // 3. Write the new task to PostgreSQL
  await prisma.task.create({
    data: {
      ...fields.value,
      deadline,
      projectId,
      userId: session.user.id,
    },
  });

  // 4. Tell Next.js to refresh the dashboard so the new task appears
  revalidatePath('/', 'layout');
  return null;
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

  // A timer running on it stops, and the time so far is logged.
  await stopFocusFor(session.user.id, taskId);

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

/** Saves the edit form. Returns an error message, or null when it's saved. */
export async function updateTask(formData: FormData): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const taskId = formData.get('taskId') as string;
  const fields = parseTaskFields(formData);
  if ('error' in fields) return fields.error;
  const deadline = await readOptionalTime(formData, 'deadline');
  if (deadline === undefined) return "The due date isn't a valid date.";
  // The optional "Start at" field: empty lets Orbit plan the task.
  const plannedStart = await readOptionalTime(formData, 'plannedStart');
  if (plannedStart === undefined) return "The start time isn't valid.";
  const projectId = await readProjectId(formData, session.user.id);

  await prisma.task.updateMany({
    where: {
      id: taskId,
      userId: session.user.id, // Strict data isolation
    },
    data: { ...fields.value, deadline, plannedStart, projectId },
  });

  revalidatePath('/', 'layout');
  return null;
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
