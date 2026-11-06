// Rules for demo accounts that don't need the database to work out, kept
// here so they can be tested on their own.

/** Demo accounts, and their sessions, last this long. */
export const DEMO_LIFETIME_MS = 24 * 60 * 60 * 1000;

/** The Prisma filter for demo accounts old enough to delete. */
export function expiredDemoUsers(now: Date) {
  return {
    isDemo: true,
    createdAt: { lt: new Date(now.getTime() - DEMO_LIFETIME_MS) },
  };
}
