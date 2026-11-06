import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaClient, type Prisma } from '@prisma/client';
import type { BrowserContext } from '@playwright/test';

// Direct database access for tests that need a kind of user the UI can't
// create, like a brand-new GitHub account (tests can't sign in with GitHub).
export const prisma = new PrismaClient();

/**
 * Creates a user who has just signed up and hasn't done the welcome setup,
 * with a session, and signs the browser in as them. Returns their id.
 */
export async function signInAsNewUser(
  context: BrowserContext,
  baseURL: string,
  // Extra fields for the user, e.g. a finished setup and their own tasks.
  extra: Omit<Prisma.UserCreateInput, 'email'> = {}
): Promise<string> {
  const sessionToken = randomBytes(32).toString('hex');
  const user = await prisma.user.create({
    data: {
      ...extra,
      name: 'Ada Lovelace',
      email: `new-${randomUUID()}@e2e.invalid`,
      sessions: {
        create: {
          sessionToken,
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      },
    },
  });

  await context.addCookies([
    {
      name: 'authjs.session-token',
      value: sessionToken,
      url: baseURL,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  return user.id;
}

/** Removes a test user and everything of theirs. */
export async function deleteUser(id: string) {
  await prisma.user.delete({ where: { id } }).catch(() => {});
}
