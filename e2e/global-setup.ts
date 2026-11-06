import { PrismaClient } from '@prisma/client';

/**
 * Clears demo accounts from the test database before a run. Every test starts
 * its own demo, and the app limits how many demos can start in an hour, so
 * without this, running the suite a few times in an hour would hit the limit.
 *
 * Only ever touches a database on this machine (local Docker or the CI
 * service), never a remote one.
 */
export default async function globalSetup() {
  const url = process.env.DATABASE_URL ?? '';
  const host = url.match(/@([^:/?]+)/)?.[1];
  if (host !== 'localhost' && host !== '127.0.0.1') {
    console.warn(
      `Not clearing demo accounts: the database (${host}) isn't local.`
    );
    return;
  }

  const prisma = new PrismaClient();
  try {
    await prisma.user.deleteMany({ where: { isDemo: true } });
  } finally {
    await prisma.$disconnect();
  }
}
