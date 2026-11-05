# Orbit

Orbit is a daily planner that builds your schedule for you. You give it tasks (with a time estimate and a priority), the events you can't move, and the hours you want to work. It fits the tasks into the gaps and redraws the plan whenever something changes.

![Orbit dashboard showing today's plan on an hour grid](docs/images/dashboard.png)

I'm building it to learn how to design a scheduling algorithm properly and to practise full-stack patterns in a real multi-user app. It's a work in progress.

## How the scheduler works

The core is a single pure function, `generateSchedule` in [`src/lib/engine/scheduler.ts`](src/lib/engine/scheduler.ts). It knows nothing about the database. It takes plain task and time-window objects and returns a list of blocks, which makes it easy to reason about and test on its own.

For each day it:

1. Starts from your working hours (for example 09:00–17:00).
2. Cuts out your fixed commitments, leaving a list of free windows.
3. Sorts tasks by priority, highest first.
4. Walks through the free windows, placing each task in the earliest space available. A task that doesn't fit in one window is split across the next ones.
5. Marks any task that still has time left over at the end of the day as "bumped", so the UI can warn you it won't fit.

The plan isn't stored. It's recalculated on every page load from the current data, so editing a task, adding a meeting or logging time changes it immediately.

## What works today

- Sign in with GitHub.
- Add, edit, complete and delete tasks. Each task has a title, a time estimate in minutes and a priority (low, medium or high).
- Add, edit and delete fixed commitments, such as appointments or lectures.
- Set your working hours separately for each day of the week.
- See today's plan on an hour-by-hour timeline, with commitments shown alongside the scheduled tasks and a warning for anything that doesn't fit.
- Use a focus timer on any task. Stopping it logs the time worked, takes it off the task's remaining estimate (completing the task when it reaches zero), and redraws the plan.
- A summary of the day: time focused, tasks completed versus planned, and time still scheduled.

## Design decisions

- **The engine is decoupled from the database.** Pages read from Prisma, convert the rows into small engine types (`SchedulableTask`, `TimeWindow`), and pass those in. The analytics summary (`src/lib/analytics/summarize.ts`) follows the same pattern.
- **Every query is scoped to the signed-in user.** Server Actions take the user ID from the server-side session, never from the request, and filter every read and write by it. `TimeEntry` has no user column, so it's checked through its parent task, both when an entry is created and when entries are read.
- **Time is stored in whole minutes.** Durations are integers, which avoids floating-point drift when times are added up and subtracted.
- **No experimental React features.** I've left the React Compiler and Cache Components switched off, so state and memoization are handled by hand.

## Known limitations

- The plan always starts at the beginning of the working day, even if it's already the afternoon.
- "Completed today" uses a task's `updatedAt` timestamp, because there's no dedicated `completedAt` column yet.
- Times are calculated in the server's timezone.

## Next steps

- Start the plan from the current time instead of the start of the day.
- A `completedAt` column on tasks.
- Projects for grouping tasks, and saved schedules. The `Project`, `Schedule` and `ScheduleBlock` models are already in the schema but aren't used yet.

## Tech stack

- Next.js 16 (App Router, Server Components, Server Actions) with TypeScript
- PostgreSQL, run locally in Docker
- Prisma 6
- Auth.js v5 with GitHub OAuth
- Tailwind CSS v4

## Project layout

```
prisma/schema.prisma        Database schema
prisma/migrations/          SQL migrations, applied on deploy
src/app/page.tsx            Dashboard: loads data, runs the engine, renders the page
src/app/actions/            Server Actions for tasks, commitments, availability and time entries
src/lib/engine/scheduler.ts The scheduling engine
src/lib/analytics/          Daily summary calculations
src/components/             UI components
```

## Running it locally

You'll need Node.js 24 (see `.nvmrc`) and Docker.

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/MariusMalong/orbit.git
   cd orbit
   npm install
   ```

2. Start a PostgreSQL container:

   ```bash
   docker run --name orbit-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=orbit -p 5432:5432 -d postgres:15-alpine
   ```

3. Create a GitHub OAuth app under **GitHub → Settings → Developer settings → OAuth Apps**. Set the homepage URL to `http://localhost:3000` and the callback URL to `http://localhost:3000/api/auth/callback/github`.

4. Copy the example environment file, then fill in `AUTH_SECRET` and your OAuth app's client ID and secret:

   ```bash
   cp .env.example .env
   ```

5. Create the database tables:

   ```bash
   npx prisma migrate dev
   ```

6. Start the dev server and open http://localhost:3000:

   ```bash
   npm run dev
   ```

## Checks

```bash
npm run typecheck     # TypeScript
npm run lint          # ESLint
npm run format:check  # Prettier (npm run format to fix)
npm test              # Vitest
```
