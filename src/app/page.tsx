import { prisma } from '@/lib/prisma';

export default async function Home() {
  const userCount = await prisma.user.count();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-24 text-white">
      <div className="z-10 flex flex-col items-center justify-between font-mono text-sm max-w-5xl w-full gap-4">
        <h1 className="text-4xl font-bold tracking-tight">Orbit — Your day, in motion</h1>
        <p className="font-semibold text-emerald-400">
          Database Connected! Total Users in DB: {userCount}
        </p>
      </div>
    </main>
  );
}