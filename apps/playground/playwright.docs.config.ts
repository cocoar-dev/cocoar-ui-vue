import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.DOCS_TEST_PORT ?? 5177);
const command = process.env.DOCS_TEST_PREVIEW ? 'preview' : 'dev';

export default defineConfig({
  testDir: './docs-e2e',
  outputDir: './test-results/docs-presentation',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'webkit-phone', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: `pnpm --filter @cocoar/docs ${command} --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
