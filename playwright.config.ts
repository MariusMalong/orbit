import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// Tests that set up users directly (see e2e/db.ts) need DATABASE_URL. CI sets
// it; locally it comes from .env, like it does for the app.
if (!process.env.DATABASE_URL && existsSync('.env')) {
  process.loadEnvFile('.env');
}

// End-to-end tests: real browser, real server, real database.
//
// Locally this starts `next dev` on port 3100 (or reuses one already there);
// set E2E_BASE_URL to test a server you already have running instead. In CI
// the workflow builds the app first, so this starts `next start`.

const PORT = 3100;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * A timezone where it's currently mid-morning, so a demo account always has
 * a full working day planned, whenever the tests run. Etc/GMT zones have
 * fixed whole-hour offsets, and their sign is inverted: Etc/GMT-10 is UTC+10.
 */
function morningTimeZone(): string {
  let offset = 10 - new Date().getUTCHours(); // Hours ahead of UTC for ~10:00
  if (offset > 14) offset -= 24;
  if (offset < -12) offset += 24;
  if (offset === 0) return 'Etc/GMT';
  return offset > 0 ? `Etc/GMT-${offset}` : `Etc/GMT+${-offset}`;
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    timezoneId: morningTimeZone(),
    locale: 'en-GB',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: process.env.CI
          ? `npm run start -- -p ${PORT}`
          : `npm run dev -- -p ${PORT}`,
        url: `${baseURL}/signin`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: { AUTH_TRUST_HOST: 'true' },
      },
});
