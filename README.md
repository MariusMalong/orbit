# Orbit 🪐
*Your day, in motion.*

Orbit is an adaptive personal productivity and scheduling application. 

While most to-do apps act as rigid calendars, Orbit is being built to handle the reality of changing plans. The core goal is to build a deterministic scheduling engine that can recalculate a daily schedule when tasks overrun, preserving fixed commitments while automatically shifting lower-priority work.

> **Note:** This project is currently under active development.

## 🏗️ Current Status
- [x] Application architecture and PostgreSQL database schema design.
- [x] Dockerized local development environment.
- [x] Delegated OAuth 2.0 authentication via Auth.js (GitHub provider).
- [x] Secure Task CRUD operations using React Server Actions and Prisma.
- [ ] **Next Up:** Developing the deterministic scheduling engine for task slotting and plan recovery.

## 🛠️ Tech Stack
- **Framework:** Next.js (App Router, Server Components, Server Actions)
- **Language:** TypeScript
- **Database:** PostgreSQL (via Docker)
- **ORM:** Prisma
- **Authentication:** Auth.js v5 (NextAuth)
- **Styling:** Tailwind CSS v4

## 🚀 Local Development Setup

To run this project locally, you will need [Node.js](https://nodejs.org/) and [Docker](https://www.docker.com/) installed.

**1. Clone the repository**
```bash
git clone https://github.com/MariusMalong/orbit.git
cd orbit
```

**2. Start the local database**
Ensure Docker is running, then spin up the PostgreSQL container:
```bash
docker run --name orbit-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=orbit -p 5432:5432 -d postgres:15-alpine
```

**3. Set up environment variables**
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/orbit?schema=public"
AUTH_SECRET="generate_a_random_32_character_string"
AUTH_GITHUB_ID="your_github_oauth_client_id"
AUTH_GITHUB_SECRET="your_github_oauth_client_secret"
```

**4. Install dependencies and sync the database**
```bash
npm install
npx prisma db push
```

**5. Start the development server**
```bash
npm run dev
```
Visit `http://localhost:3000` to view the application.