import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  workers: process.env.CI ? 1 : undefined,
  expect: {
    timeout: 5_000,
  },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-extension',
      testMatch: /extension\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chrome-smoke',
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'edge-smoke',
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
  ],
});
