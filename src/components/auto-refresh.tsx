'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** How old the page can get before it's redrawn. */
export const REFRESH_AFTER_MS = 5 * 60_000;
const CHECK_EVERY_MS = 30_000;

/**
 * Today and Week are drawn on the server at one moment, so left open they'd
 * show that moment for ever: the Now line stops, and overnight it's still
 * yesterday. This redraws the page (router.refresh, which keeps what's on
 * screen in place) when it's a few minutes old, straight away when the tab
 * comes back after that long, and at midnight.
 *
 * It waits while a task is being dragged or a dialog is open, so nothing
 * moves under the pointer or the form.
 */
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let drawnAt = Date.now();
    let drawnOn = new Date().toDateString();

    const isBusy = () =>
      document.body.dataset.dragging !== undefined ||
      document.querySelector('dialog[open]') !== null;

    const check = () => {
      if (document.visibilityState !== 'visible' || isBusy()) return;
      const isStale = Date.now() - drawnAt >= REFRESH_AFTER_MS;
      const isNewDay = new Date().toDateString() !== drawnOn;
      if (!isStale && !isNewDay) return;
      drawnAt = Date.now();
      drawnOn = new Date().toDateString();
      router.refresh();
    };

    const interval = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', check);
    };
  }, [router]);

  return null;
}
