import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy policy | Orbit',
};

const CONTACT_EMAIL = 'mariusmalong@gmail.com';
const LAST_UPDATED = '13 November 2026';

// Public: Google's OAuth consent screen links here, so it must load without
// signing in. Keep it in step with what the app actually stores (see
// prisma/schema.prisma).

export default function PrivacyPage() {
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-6 text-ink-2 [&_a]:font-medium [&_a]:text-ink [&_a]:underline [&_a]:decoration-accent [&_a]:underline-offset-2 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_li]:mt-1 [&_section]:flex [&_section]:flex-col [&_section]:gap-2 [&_ul]:list-disc [&_ul]:pl-5">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Privacy policy
        </h1>
        <p className="mt-1 text-sm text-muted">Last updated {LAST_UPDATED}</p>
      </header>

      <p>
        Orbit is a daily planner built and run by Marius Malong as a personal
        project. This page explains what Orbit stores about you, why, and how to
        delete it. In short: Orbit keeps only what it needs to plan your days,
        never sells or shares it, and you can delete all of it at any time.
      </p>

      <section aria-labelledby="collect">
        <h2 id="collect">What Orbit stores</h2>
        <ul>
          <li>
            <strong>From GitHub or Google, when you sign in:</strong> your name,
            email address and profile picture, your account ID with that
            service, and the sign-in tokens it issues. Orbit asks only for your
            basic profile and email address, and doesn&apos;t use the tokens to
            read anything else from your GitHub or Google account.
          </li>
          <li>
            <strong>What you add:</strong> your tasks, events, working hours and
            days off, and the time you log with the focus timer.
          </li>
          <li>
            <strong>Demo accounts:</strong> to limit how many demos one visitor
            can start, Orbit stores a keyed hash of your IP address with the
            demo account. The IP address itself isn&apos;t stored, and the hash
            can&apos;t be turned back into it.
          </li>
        </ul>
      </section>

      <section aria-labelledby="cookies">
        <h2 id="cookies">Cookies</h2>
        <p>Orbit uses three cookies, all needed for it to work:</p>
        <ul>
          <li>a session cookie that keeps you signed in,</li>
          <li>your timezone, so your day is planned in your local time,</li>
          <li>your light or dark theme choice.</li>
        </ul>
        <p>
          There are no analytics, advertising or tracking cookies, and no
          third-party scripts.
        </p>
      </section>

      <section aria-labelledby="use">
        <h2 id="use">How it&apos;s used</h2>
        <p>
          Your data is used only to show you your account and plan your days. It
          isn&apos;t sold, shared with anyone, used for advertising, or used to
          train AI models.
        </p>
        <p>
          Orbit&apos;s use of information received from Google APIs adheres to
          the{' '}
          <a href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
      </section>

      <section aria-labelledby="where">
        <h2 id="where">Where it&apos;s kept</h2>
        <p>
          Orbit runs on{' '}
          <a href="https://vercel.com/legal/privacy-policy">Vercel</a> and
          stores its data in a PostgreSQL database hosted by{' '}
          <a href="https://neon.com/privacy-policy">Neon</a>. Both process data
          on Orbit&apos;s behalf. Vercel may keep short-lived request logs,
          including IP addresses, as part of running the service.
        </p>
      </section>

      <section aria-labelledby="keep">
        <h2 id="keep">
          How long it&apos;s kept, getting a copy, and deleting it
        </h2>
        <p>
          Your data is kept until you delete your account. You can do that
          yourself at any time from the{' '}
          <Link href="/account">Account page</Link> (click your name at the top
          of the page): everything is deleted straight away, and nothing is
          kept. Demo accounts close after 24 hours, and they and everything in
          them are deleted automatically within a day after that.
        </p>
        <p>
          The Account page also has a <strong>Download my data</strong> button,
          which gives you a copy of everything you&apos;ve added as a JSON file.
        </p>
        <p>
          You can also disconnect Orbit from your GitHub or Google account in
          that service&apos;s settings.
        </p>
      </section>

      <section aria-labelledby="contact">
        <h2 id="contact">Contact</h2>
        <p>
          For questions about your data, or to ask for a copy or deletion of it,
          email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
        <p>
          If this policy changes, the date at the top of this page will change
          with it.
        </p>
      </section>
    </article>
  );
}
