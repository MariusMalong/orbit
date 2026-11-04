import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { AuthButton } from '@/components/auth-button';

// Exposed as CSS variables and mapped to font-sans / font-display in globals.css.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'Orbit | Your day, in motion',
  description: 'Adaptive daily planning and task management.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="flex min-h-screen flex-col bg-canvas font-sans text-ink antialiased">
        <header className="sticky top-0 z-50 border-b border-line bg-surface">
          <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 md:px-6">
            <div className="flex items-center gap-2.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="3" r="2" className="fill-accent" stroke="none" />
              </svg>
              <span className="font-display text-lg font-semibold">Orbit</span>
            </div>
            <AuthButton />
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 md:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
