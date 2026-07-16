import { defineConfig, devices } from '@playwright/test';

const stagingBaseUrl = process.env.E2E_STAGING_BASE_URL?.trim();
const stagingStorageState = process.env.E2E_STAGING_STORAGE_STATE?.trim();
const localBaseUrl = 'http://127.0.0.1:4173';
const hasAuthenticatedStagingBackend = Boolean(
  process.env.E2E_STAGING_EMAIL?.trim()
  && process.env.E2E_STAGING_PASSWORD
  && process.env.VITE_SUPABASE_URL?.trim()
  && process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim(),
);
const localServerEnv = {
  VITE_SUPABASE_URL: hasAuthenticatedStagingBackend
    ? process.env.VITE_SUPABASE_URL!
    : 'https://ci.invalid.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: hasAuthenticatedStagingBackend
    ? process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
    : 'ci-public-test-key',
};

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: stagingBaseUrl || localBaseUrl,
    channel: 'chrome',
    storageState: stagingStorageState || undefined,
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
    env: localServerEnv,
    url: localBaseUrl,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});