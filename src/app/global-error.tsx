'use client';

/**
 * The last resort, for when the root layout itself fails (it reads the
 * session for the header). It replaces the whole document, so it can't use
 * the app's stylesheet or theme: the few styles it needs are inline, and it
 * follows the device's light or dark setting.
 */
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, sans-serif',
          colorScheme: 'light dark',
          textAlign: 'center',
          padding: '1rem',
        }}
      >
        <title>Something went wrong | Orbit</title>
        <main>
          <h1 style={{ fontSize: '1.25rem' }}>Something went wrong</h1>
          <p>Orbit couldn&apos;t load. Anything you&apos;d saved is safe.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              font: 'inherit',
              padding: '0.6rem 1.2rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
