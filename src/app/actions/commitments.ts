'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { getUserTimeZone } from '@/lib/time/user-timezone';
import { parseDateTimeLocal } from '@/lib/time/zoned';

// datetime-local inputs send a wall-clock time with no timezone, like
// "2026-11-06T12:30". It means 12:30 for the visitor, not for the server.
async function readTimeRange(formData: FormData) {
  const timeZone = await getUserTimeZone();
  const startTime = parseDateTimeLocal(
    formData.get('startTime') as string,
    timeZone
  );
  const endTime = parseDateTimeLocal(
    formData.get('endTime') as string,
    timeZone
  );
  if (!startTime || !endTime) {
    throw new Error('Invalid start or end time.');
  }
  return { startTime, endTime };
}

export async function addCommitment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('You must be logged in to add a commitment.');
  }

  const title = formData.get('title') as string;
  const { startTime, endTime } = await readTimeRange(formData);

  await prisma.fixedCommitment.create({
    data: {
      title,
      startTime,
      endTime,
      userId: session.user.id,
    },
  });

  revalidatePath('/');
}

export async function deleteCommitment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorised');
  }

  const commitmentId = formData.get('commitmentId') as string;

  await prisma.fixedCommitment.deleteMany({
    where: {
      id: commitmentId,
      userId: session.user.id, // Strict data isolation
    },
  });

  revalidatePath('/');
}

export async function updateCommitment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const commitmentId = formData.get('commitmentId') as string;
  const title = formData.get('title') as string;
  const { startTime, endTime } = await readTimeRange(formData);

  await prisma.fixedCommitment.updateMany({
    where: {
      id: commitmentId,
      userId: session.user.id,
    },
    data: {
      title,
      startTime,
      endTime,
    },
  });

  revalidatePath('/');
}
