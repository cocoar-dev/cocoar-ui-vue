import { defineConfig, devices } from '@playwright/test';

const PORT = 5188;

export default defineConfig({
  testDir: './e2e',
  // Let us run tests one at a time so Monaco's global state and the TS worker stay sane
  // across tests. These are integration tests, not a massive unit suite.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'dot' : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Headless is the default; flip to `false` locally for debugging.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // The engine of every iPad and iPhone browser, with a tablet profile (touch, mobile
    // viewport). Runs only the tests tagged `@touch`. Playwright's WebKit is not iOS Safari:
    // it proves the WebKit engine and its touch events, not iOS gestures or the soft keyboard.
    { name: 'webkit-tablet', use: { ...devices['iPad (gen 7)'] }, grep: /@touch/ },
  ],
  webServer: {
    command: 'pnpm dev',
    port: PORT,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 120_000,
  },
});
