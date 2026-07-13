import { defineConfig, devices } from '@playwright/test';

const stagingBaseUrl = process.env.E2E_STAGING_BASE_URL?.trim();
const localBaseUrl = 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: stagingBaseUrl || localBaseUrl,
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: stagingBaseUrl ? undefined : {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: localBaseUrl,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});