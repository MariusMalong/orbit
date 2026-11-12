/**
 * Shown straight away while a page is being drawn on the server, for example
 * going from Today to Week, which plans eight weeks ahead first. The header
 * and tab bar stay, so only the page area waits.
 */
export default function Loading() {
  return (
    <div role="status" className="flex flex-col gap-5">
      <div className="h-9 w-64 max-w-full rounded-lg bg-subtle motion-safe:animate-pulse" />
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:max-w-xl">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-16 rounded-xl bg-subtle motion-safe:animate-pulse"
          />
        ))}
      </div>
      <div className="h-96 rounded-xl bg-subtle motion-safe:animate-pulse" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
