'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TIMEZONE_COOKIE } from '@/lib/time/zoned';

/**
 * Saves the browser's timezone in a cookie so the server can plan the day in
 * the visitor's own time (see getUserTimeZone). If it was missing or has
 * changed, for example after travelling, the page re-renders with it.
 */
export function TimezoneSync() {
  const router = useRouter();

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const saved = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${TIMEZONE_COOKIE}=`))
      ?.slice(TIMEZONE_COOKIE.length + 1);

    if (!timeZone || saved === timeZone) return;

    // IANA names only use letters, digits, "/", "_", "-" and "+", which are
    // all safe in a cookie value as they are.
    document.cookie = `${TIMEZONE_COOKIE}=${timeZone}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);

  return null;
}
