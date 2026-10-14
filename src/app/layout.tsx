import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthButton } from '@/components/auth-button';

const inter = Inter({ subsets: ['latin'] });

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
    <html lang="en">
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 p-4 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
            <span className="text-xl font-bold tracking-tight text-white">Orbit</span>
            <AuthButton />
          </div>
        </nav>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-4 md:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}