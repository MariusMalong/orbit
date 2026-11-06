import 'next-auth';

declare module 'next-auth' {
  interface User {
    // Set for temporary "Try the demo" accounts (see src/app/actions/demo.ts).
    isDemo?: boolean;
    // When the welcome setup was finished or skipped (the database column).
    onboardedAt?: Date | null;
    // Set on the session: false sends the user to /welcome.
    onboarded?: boolean;
  }
}
