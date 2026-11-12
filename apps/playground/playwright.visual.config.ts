import { defineConfig, devices } from '@playwright/test';

// Visual baselines (visual/README.md). Run only through scripts/visual.mjs: the
// images are made in the Playwright Docker image, never on a developer's OS,
// because font rasterisation differs between systems.

const PORT = 5188;

export default defineConfig({
  testDir: './visual',
  // One file per image, no platform or project suffix: there is one platform.
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  outputDir: './visual-results/artifacts',
  globalSetup: './visual/warm-up.ts',
  fullyParallel: true,
  workers: 4,
  forbidOnly: !!process.env.CI,
  // A retry would hide exactly the flakiness a zero-tolerance comparison must expose.
  retries: 0,
  // Baselines are written only with --update-snapshots (visual.mjs --update), never as a side effect.
  updateSnapshots: 'none',
  reporter: [
    [process.env.CI ? 'dot' : 'list'],
    ['html', { outputFolder: './visual-results/report', open: 'never' }],
  ],
  timeout: 30_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixels: 0,
      threshold: 0,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 1,
    contextOptions: { reducedMotion: 'reduce' },
    // Dark mode comes from the `dark-mode` class only; the media query stays fixed.
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'UTC',
    trace: 'off',
    screenshot: 'off',
  },
  webServer: {
    command: 'pnpm dev',
    port: PORT,
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 180_000,
  },
});
