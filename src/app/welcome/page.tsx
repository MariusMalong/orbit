import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { WelcomeForm } from '@/components/welcome-form';
import { completeWeek } from '@/lib/planning/weekly-hours';
import { DEFAULT_HOURS, type WeeklyHours } from '@/lib/planning/days';

export const metadata: Metadata = {
  title: 'Welcome | Orbit',
};

/**
 * First-run setup for a new account: working hours and days off, and a few
 * first tasks. Today and Week send users here until it's done or skipped.
 */
export default async function WelcomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/signin');
  }
  if (session.user.onboarded) {
    redirect('/');
  }

  // Suggest a Monday-to-Friday week, keeping anything already saved.
  const saved = await prisma.availability.findMany({
    where: { userId: session.user.id },
  });
  const weekendOff = { ...DEFAULT_HOURS, isDayOff: true };
  const weeklyHours: WeeklyHours = {
    0: weekendOff,
    6: weekendOff,
    ...Object.fromEntries(
      saved.map((a) => [
        a.dayOfWeek,
        { startTime: a.startTime, endTime: a.endTime, isDayOff: a.isDayOff },
      ])
    ),
  };
  const firstName = session.user.name?.split(' ')[0];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          {firstName ? `Welcome to Orbit, ${firstName}` : 'Welcome to Orbit'}
        </h1>
        <p className="mt-2 text-muted">
          Orbit plans your tasks into the free time around your events, inside
          the hours you work, and moves whatever doesn&apos;t fit to the next
          working day. Two quick things and you&apos;re set.
        </p>
      </div>
      <WelcomeForm week={completeWeek(weeklyHours)} />
    </div>
  );
}
