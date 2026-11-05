import 'next-auth';

declare module 'next-auth' {
  interface User {
    // Set for temporary "Try the demo" accounts (see src/app/actions/demo.ts).
    isDemo?: boolean;
  }
}
