import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E testing framework configuration.
 * Configured with dynamic isolated test server environments.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: [
    {
      command: 'bun run --cwd ../server dev',
      port: 5001,
      env: {
        NODE_ENV: 'test',
      },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev -- --port 5174',
      port: 5174,
      env: {
        BACKEND_PORT: '5001',
      },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
