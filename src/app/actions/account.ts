'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * Deletes the signed-in user and everything of theirs: tasks, events,
 * working hours, logged time, sign-in links and sessions all go with the
 * user row (every relation cascades). The session cookie is left behind, but
 * its session no longer exists, so the visitor is signed out.
 */
export async function deleteAccount() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('You must be logged in to delete your account.');
  }

  await prisma.user.delete({ where: { id: session.user.id } });

  redirect('/signin?deleted=1');
}
