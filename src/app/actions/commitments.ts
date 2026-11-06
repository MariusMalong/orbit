'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { getUserTimeZone } from '@/lib/time/user-timezone';
import { parseDateTimeLocal } from '@/lib/time/zoned';
import { moveSeries } from '@/lib/planning/recurrence';

// datetime-local inputs send a wall-clock time with no timezone, like
// "2026-11-06T12:30". It means 12:30 for the visitor, not for the server.
async function readTimeRange(formData: FormData, timeZone: string) {
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

// Which events a change to a weekly event applies to: just the occurrence
// that was clicked, or every week.
type Scope = 'this' | 'all';

function readScope(formData: FormData): {
  scope: Scope;
  occurrenceStart: Date | null;
} {
  const scope: Scope = formData.get('scope') === 'this' ? 'this' : 'all';
  const value = formData.get('occurrenceStart') as string | null;
  const occurrenceStart = value ? new Date(value) : null;
  if (occurrenceStart && Number.isNaN(occurrenceStart.getTime())) {
    throw new Error('Invalid occurrence.');
  }
  return { scope, occurrenceStart };
}

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user.id;
}

export async function addCommitment(formData: FormData) {
  const userId = await requireUserId();
  const timeZone = await getUserTimeZone();

  const title = formData.get('title') as string;
  const { startTime, endTime } = await readTimeRange(formData, timeZone);

  await prisma.fixedCommitment.create({
    data: {
      title,
      startTime,
      endTime,
      repeatsWeekly: formData.get('repeatsWeekly') === 'on',
      userId,
    },
  });

  revalidatePath('/', 'layout');
}

/**
 * Deletes an event. For a weekly event, "this" skips just the clicked
 * occurrence and "all" deletes the whole series.
 */
export async function deleteCommitment(formData: FormData) {
  const userId = await requireUserId();
  const commitmentId = formData.get('commitmentId') as string;
  const { scope, occurrenceStart } = readScope(formData);

  const event = await prisma.fixedCommitment.findFirst({
    where: { id: commitmentId, userId }, // Strict data isolation
  });
  if (!event) return;

  if (event.repeatsWeekly && scope === 'this' && occurrenceStart) {
    await prisma.fixedCommitment.update({
      where: { id: event.id },
      data: { skippedStarts: { push: occurrenceStart } },
    });
  } else {
    await prisma.fixedCommitment.delete({ where: { id: event.id } });
  }

  revalidatePath('/', 'layout');
}

/**
 * Saves the edit form. A one-off event is simply updated (and can be made
 * weekly). For a weekly event:
 * - "this": the clicked occurrence is skipped and a one-off event with the
 *   new details takes its place;
 * - "all": every week moves by the same change (see moveSeries), or, if
 *   "Repeats every week" was unticked, it becomes a single one-off event.
 */
export async function updateCommitment(formData: FormData) {
  const userId = await requireUserId();
  const timeZone = await getUserTimeZone();

  const commitmentId = formData.get('commitmentId') as string;
  const title = formData.get('title') as string;
  const { startTime, endTime } = await readTimeRange(formData, timeZone);
  const repeatsWeekly = formData.get('repeatsWeekly') === 'on';
  const { scope, occurrenceStart } = readScope(formData);

  const event = await prisma.fixedCommitment.findFirst({
    where: { id: commitmentId, userId }, // Strict data isolation
  });
  if (!event) return;

  if (!event.repeatsWeekly || !occurrenceStart) {
    await prisma.fixedCommitment.update({
      where: { id: event.id },
      data: { title, startTime, endTime, repeatsWeekly },
    });
  } else if (scope === 'this') {
    await prisma.$transaction([
      prisma.fixedCommitment.update({
        where: { id: event.id },
        data: { skippedStarts: { push: occurrenceStart } },
      }),
      prisma.fixedCommitment.create({
        data: { title, startTime, endTime, userId },
      }),
    ]);
  } else if (!repeatsWeekly) {
    await prisma.fixedCommitment.update({
      where: { id: event.id },
      data: {
        title,
        startTime,
        endTime,
        repeatsWeekly: false,
        skippedStarts: [],
      },
    });
  } else {
    await prisma.fixedCommitment.update({
      where: { id: event.id },
      data: {
        title,
        ...moveSeries(event, occurrenceStart, startTime, endTime, timeZone),
        // Skipped dates belonged to the old times, so they no longer match.
        skippedStarts: [],
      },
    });
  }

  revalidatePath('/', 'layout');
}
