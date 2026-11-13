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
  // The comparison is in visual.spec.ts: settled captures (two byte-identical in
  // a row) compared pixel for pixel, no tolerance.
  expect: { timeout: 10_000 },
  use: {
    ...devices['Desktop Chrome'],
    // Deterministic rasterisation; each flag was measured with `visual.mjs --repeat`
    // (2026-11-13; the probe set is the ten focus stories plus local-scope with an
    // input in its popover). The container rasterises on the CPU already
    // (SwiftShader, "rasterization: disabled_software").
    launchOptions: {
      args: [
        // Greyscale text antialiasing. Otherwise Chromium chooses subpixel (LCD)
        // or greyscale per layer, depending on how it composites the page, and
        // that occasionally depends on timing: a label drawn either way.
        '--disable-lcd-text',
        // Repaint whole tiles, not only the changed rect. With partial raster a
        // curved edge (an input's corner) re-rasterised next to a focus change
        // or an overlay comes out 1–2 levels different now and then.
        // Probe set: 20 failures in 1,700 captures without it, 0 in 850 with it.
        // Measured without effect (not used): --num-raster-threads=1 18/850,
        // --disable-skia-runtime-opts 23/850, --disable-gpu 11/850;
        // --disable-threaded-compositing: the pages never become ready.
        '--disable-partial-raster',
      ],
    },
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
    // Its own server configuration, not the playground's `dev` script or vite.config.ts.
    command: `pnpm exec vite --config vite.visual.config.ts --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 180_000,
  },
});
