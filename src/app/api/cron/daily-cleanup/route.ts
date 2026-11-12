import { timingSafeEqual } from 'node:crypto';
import { deleteExpiredDemos, purgeDeletedTasks } from '@/lib/cleanup';

// Called once a day by Vercel Cron (see vercel.json): deletes expired demo
// accounts (even when nobody starts a new demo), and purges tasks deleted
// more than a day ago. Vercel sends the
// project's CRON_SECRET as a bearer token; anyone else gets a 401. Without a
// CRON_SECRET set, the route refuses everything.

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  // Compared in constant time, so the answer's timing gives nothing away.
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const [demos, tasks] = await Promise.all([
    deleteExpiredDemos(),
    purgeDeletedTasks(),
  ]);
  return Response.json({ deleted: { demos, tasks } });
}
