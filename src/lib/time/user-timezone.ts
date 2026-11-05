import { cookies, headers } from 'next/headers';
import { isValidTimeZone, TIMEZONE_COOKIE } from '@/lib/time/zoned';

/**
 * The timezone to plan the current visitor's day in, most reliable first:
 * 1. The browser's own timezone, which TimezoneSync saves in a cookie.
 * 2. Vercel's guess from the visitor's IP address, so the very first page
 *    load (before the cookie exists) is usually right too.
 * 3. The server's timezone, e.g. when running locally.
 */
export async function getUserTimeZone(): Promise<string> {
  const fromBrowser = (await cookies()).get(TIMEZONE_COOKIE)?.value;
  if (fromBrowser && isValidTimeZone(fromBrowser)) return fromBrowser;

  const fromIp = (await headers()).get('x-vercel-ip-timezone');
  if (fromIp && isValidTimeZone(fromIp)) return fromIp;

  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
