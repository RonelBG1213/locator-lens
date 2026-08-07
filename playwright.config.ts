import { defineConfig } from '@playwright/test';

export const BASE_URL = 'http://localhost:5178';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'list' : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tests/fixtures/serve.mjs',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
  },
  projects: [
    // Extension tests launch their own persistent context, so no browser config here.
    { name: 'chromium' },
  ],
});
