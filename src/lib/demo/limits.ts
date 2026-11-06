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

/** How many demos can be started in an hour, by one visitor and by everyone. */
export const DEMO_LIMITS = { perVisitorPerHour: 10, totalPerHour: 300 };

export const DEMO_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/**
 * The visitor's IP address from the request headers. On Vercel these are set
 * by the platform, not the browser. Returns null when there's none, or when
 * the request comes from this machine (local development and CI), which is
 * exempt from the per-visitor limit.
 */
export function clientIp(headers: {
  get(name: string): string | null;
}): string | null {
  const ip = (
    headers.get('x-forwarded-for')?.split(',')[0] ??
    headers.get('x-real-ip') ??
    ''
  ).trim();
  if (!ip) return null;
  const isLoopback =
    ip === '::1' || ip.startsWith('127.') || ip.startsWith('::ffff:127.');
  return isLoopback ? null : ip;
}

/**
 * Which limit a new demo would break, if any. `fromVisitor` is null when the
 * visitor's IP isn't known, so only the overall limit applies.
 */
export function demoLimitReached(recent: {
  fromVisitor: number | null;
  total: number;
}): 'visitor' | 'total' | null {
  if (
    recent.fromVisitor !== null &&
    recent.fromVisitor >= DEMO_LIMITS.perVisitorPerHour
  ) {
    return 'visitor';
  }
  if (recent.total >= DEMO_LIMITS.totalPerHour) return 'total';
  return null;
}
