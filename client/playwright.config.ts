import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E testing framework configuration.
 * Configured with dynamic isolated test server environments.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
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
