# Orbit

[![CI](https://github.com/MariusMalong/orbit/actions/workflows/ci.yml/badge.svg)](https://github.com/MariusMalong/orbit/actions/workflows/ci.yml)

Orbit is a daily planner that builds your schedule for you. You give it tasks (with a time estimate and a priority), the events you can't move, and the hours you want to work. It fits the tasks into the gaps and redraws the plan whenever something changes.

**Try it: [use-orbitplanner.vercel.app](https://use-orbitplanner.vercel.app)**

Click **Try the demo** to get your own temporary account, filled with a day of sample tasks and commitments. There's no sign-up, and the account is deleted after 24 hours. Try starting a focus timer, moving a commitment or changing your hours, and watch the plan redraw. You can also sign in with GitHub (Orbit only reads your public profile and email address).

![Orbit dashboard showing today's plan on an hour grid](docs/images/dashboard.png)

I'm building it to learn how to design a scheduling algorithm properly and to practise full-stack patterns in a real multi-user app. It's a work in progress.

## How the scheduler works

The core is a single pure function, `generateSchedule` in [`src/lib/engine/scheduler.ts`](src/lib/engine/scheduler.ts). It knows nothing about the database. It takes plain task and time-window objects and returns a list of blocks, which makes it easy to reason about and test on its own.

For each day it:

1. Starts from your working hours (for example 09:00–17:00). Once the day has started, it plans from the current time instead, rounded up to the next 5 minutes, because time that has passed can't be planned.
2. Cuts out your fixed commitments, leaving a list of free windows.
3. Orders the tasks in two tiers. Tasks due today (including overdue ones) go first, earliest deadline first. Within one day that's the "earliest deadline first" rule, which keeps lateness as low as possible when work can be split. Everything else follows priority, with the deadline only breaking ties.
4. Walks through the free windows, placing each task in the earliest space available. A task that doesn't fit in one window is split across the next ones, but never into a block shorter than 15 minutes: a gap too small to be useful is left empty, and a split is shortened if it would leave a sliver behind.
5. Marks any task that still has time left over at the end of the day as "bumped", and any task that won't be finished by its deadline as "late", so the UI can warn you.

The plan isn't stored. It's recalculated on every page load from the current data, so editing a task, adding a meeting or logging time changes it immediately.

## What works today

- Sign in with GitHub, or try a demo account with sample data.
- Add, edit, complete and delete tasks. Each task has a title, a time estimate in minutes, a priority (low, medium or high) and an optional due date and time.
- Add, edit and delete fixed commitments, such as appointments or lectures.
- Set your working hours separately for each day of the week.
- See today's plan on an hour-by-hour timeline, with commitments shown alongside the scheduled tasks, a line marking the current time, and warnings for anything that doesn't fit or won't make its deadline.
- Use a focus timer on any task. Stopping it logs the time worked, takes it off the task's remaining estimate (completing the task when it reaches zero), and redraws the plan.
- A summary of the day: time focused, tasks completed versus planned, and time still scheduled.

## Design decisions

- **The engine is decoupled from the database.** Pages read from Prisma, convert the rows into small engine types (`SchedulableTask`, `TimeWindow`), and pass those in. The analytics summary (`src/lib/analytics/summarize.ts`) follows the same pattern.
- **Every query is scoped to the signed-in user.** Server Actions take the user ID from the server-side session, never from the request, and filter every read and write by it. `TimeEntry` has no user column, so it's checked through its parent task, both when an entry is created and when entries are read.
- **Times are stored as instants and planned in the visitor's timezone.** The server runs in UTC, so "today", "09:00" and "Friday" are worked out in the visitor's own timezone by small `Intl`-based helpers (`src/lib/time/zoned.ts`), which are tested across Melbourne's daylight-saving changes. The browser saves its timezone in a cookie. Until it has, Vercel's IP-based guess is used.
- **Time is stored in whole minutes.** Durations are integers, which avoids floating-point drift when times are added up and subtracted.
- **Demo accounts are ordinary users.** "Try the demo" creates a user flagged `isDemo`, fills it from a pure seed function, and creates an Auth.js database session for it. Each visitor gets their own account, and everything else (including the per-user scoping) works exactly as for a GitHub user. Demo accounts older than 24 hours are deleted the next time someone starts a demo.
- **No experimental React features.** I've left the React Compiler and Cache Components switched off, so state and memoization are handled by hand.

## Known limitations

- Tasks that don't fit today aren't planned into the following days, so the engine can only tell you a task due later this week is at risk once it's due today.
- Starting a demo isn't rate-limited, so the only cap on demo accounts is the 24-hour cleanup.

## Next steps

- Plan several days ahead, so tasks that don't fit today roll into the next working days, and deadlines later in the week can be checked early.
- Projects for grouping tasks, and saved schedules. The `Project`, `Schedule` and `ScheduleBlock` models are already in the schema but aren't used yet.

## Tech stack

- Next.js 16 (App Router, Server Components, Server Actions) with TypeScript
- PostgreSQL: [Neon](https://neon.com) in production, Docker locally
- Prisma 6, with migrations
- Auth.js v5 with GitHub OAuth
- Tailwind CSS v4
- Vitest for the engine and analytics tests
- Hosted on Vercel, with CI on GitHub Actions

## Deployment

The live site runs on Vercel and deploys every push to `main`. The build runs `prisma migrate deploy` before `next build`, so schema changes go out with the code that needs them. The database is a Neon Postgres instance in Sydney. The app connects through Neon's connection pooler, and migrations use the direct connection (`DIRECT_URL`).

Pull requests get their own Vercel preview URL, and `main` is protected: a pull request can only be merged once CI passes.

## Project layout

```
prisma/schema.prisma        Database schema
prisma/migrations/          SQL migrations, applied on deploy
src/app/page.tsx            Dashboard: loads data, runs the engine, renders the page
src/app/actions/            Server Actions for tasks, commitments, availability and time entries
src/lib/engine/scheduler.ts The scheduling engine
src/lib/analytics/          Daily summary calculations
src/lib/demo/               Sample data for demo accounts
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

GitHub Actions runs all of these, plus a production build, on every push to `main` and every pull request.
