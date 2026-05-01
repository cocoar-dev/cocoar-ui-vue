/**
 * Performance test configuration for `@cocoar/vue-calendar`.
 *
 * Distinct from the regular `playwright.config.ts` because:
 *
 *   1. Production build, not dev mode. Dev mode adds Vue reactivity
 *      tracking warnings, on-demand module loading, source maps, HMR
 *      runtime — overheads that distort perf measurements.
 *      `vite build && vite preview` serves the same bundle that ships,
 *      so the numbers reflect what real users will see.
 *   2. Different port (4188) so this can run alongside the dev server
 *      on 5188 without conflict.
 *   3. Strict serial execution (workers: 1, fullyParallel: false) so
 *      perf measurements aren't degraded by parallel CPU contention.
 *      Perf tests are inherently I/O-light and CPU-sensitive — running
 *      them sequentially gives stable numbers in CI.
 *   4. Longer per-test timeout (60s) because each test involves a
 *      multi-second scroll session for the LoAF window.
 *
 * The regular E2E suite (script editor, markdown editor, etc.) keeps
 * using `playwright.config.ts` with dev mode for fast iteration.
 *
 * Run locally:   `pnpm --filter @cocoar/playground test:perf`
 * Run in CI:     same command, served as a Tier B gate.
 */

import { defineConfig, devices } from '@playwright/test';

const PORT = 4188;

export default defineConfig({
  testDir: './e2e-perf',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // Perf tests are flakier than functional tests by nature — allow one
  // retry to absorb GHA-runner noise (CPU steal, GC pauses).
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'dot' : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // `vite build` first, then `vite preview` to serve the production
    // bundle. The combined script is in package.json so the command is
    // explicit and reproducible.
    command: 'pnpm build:preview',
    port: PORT,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    // Production build can take a moment in CI.
    timeout: 180_000,
  },
});
