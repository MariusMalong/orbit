'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { buttonPrimary, buttonSecondary, panel } from '@/components/ui-classes';

/**
 * Shown in place of a page when something goes wrong drawing it or running
 * one of its actions (say the database didn't answer). The header and
 * footer stay, so it's still clearly Orbit, and nothing that was saved is
 * lost. In production the error's message is hidden, as it could include
 * details from the server; its digest matches the server's logs.
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest =
    error instanceof Error && 'digest' in error ? String(error.digest) : null;

  return (
    <section
      aria-labelledby="error-heading"
      className={`${panel} mx-auto flex w-full max-w-md flex-col items-center gap-3 py-8 text-center`}
    >
      <h1 id="error-heading" className="font-display text-xl font-semibold">
        Something went wrong
      </h1>
      <p className="text-sm text-muted">
        Orbit couldn&apos;t finish that. Anything you&apos;d already saved is
        safe. Try again, and if it keeps happening, come back in a few minutes.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => retry()} className={buttonPrimary}>
          Try again
        </button>
        <Link href="/" className={buttonSecondary}>
          Go to Today
        </Link>
      </div>
      {digest && (
        <p className="text-xs text-muted">
          Error code <span className="font-mono">{digest}</span>
        </p>
      )}
    </section>
  );
}
