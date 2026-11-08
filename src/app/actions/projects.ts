'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  MAX_PROJECT_NAME_LENGTH,
  parseProjectColor,
  parseProjectName,
} from '@/lib/projects';

const MAX_PROJECTS = 20;

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

const nameError = `Give the project a name of up to ${MAX_PROJECT_NAME_LENGTH} characters.`;

/** Adds a project. Returns an error message, or null when it's saved. */
export async function createProject(
  formData: FormData
): Promise<string | null> {
  const userId = await requireUserId();
  const name = parseProjectName(formData.get('name'));
  if (!name) return nameError;

  const count = await prisma.project.count({ where: { userId } });
  if (count >= MAX_PROJECTS)
    return `You can have up to ${MAX_PROJECTS} projects.`;

  await prisma.project.create({
    data: { userId, name, color: parseProjectColor(formData.get('color')) },
  });
  revalidatePath('/', 'layout');
  return null;
}

/** Renames or recolours a project. Returns an error message, or null. */
export async function updateProject(
  formData: FormData
): Promise<string | null> {
  const userId = await requireUserId();
  const name = parseProjectName(formData.get('name'));
  if (!name) return nameError;

  await prisma.project.updateMany({
    where: { id: formData.get('projectId') as string, userId },
    data: { name, color: parseProjectColor(formData.get('color')) },
  });
  revalidatePath('/', 'layout');
  return null;
}

/** Deletes a project. Its tasks stay, without a project. */
export async function deleteProject(formData: FormData) {
  const userId = await requireUserId();
  const projectId = formData.get('projectId') as string;

  await prisma.$transaction([
    prisma.task.updateMany({
      where: { projectId, userId },
      data: { projectId: null },
    }),
    prisma.project.deleteMany({ where: { id: projectId, userId } }),
  ]);
  revalidatePath('/', 'layout');
}
