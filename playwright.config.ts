import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  workers: 1, // tests share one database user
  use: {
    baseURL: 'http://localhost:3000',
    storageState: 'e2e/.auth/user.json', // a signed-in session; signed-out specs override it
    reducedMotion: 'reduce', // no splash or animation in the way of clicks; e2e/logo.spec.ts turns motion back on
    timezoneId: 'UTC', // the e2e user's profile timezone is UTC, so the timezone sync stays quiet
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
