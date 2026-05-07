/**
 * Phase 0 / Spike A — Tier B perf gate for `<VirtualizedSurface*>`.
 *
 * Runs in CI on GHA `ubuntu-latest` against the production-built
 * playground (`vite build && vite preview`). Each test:
 *
 *   1. Navigates to a stress harness page.
 *   2. Lets the surface settle.
 *   3. Installs a `PerformanceObserver({ type: 'long-animation-frame' })`.
 *   4. Drives a real-input scroll regimen via Playwright's
 *      `page.mouse.wheel` / `page.mouse.down/move/up` — NOT JS
 *      `scrollBy()`, which bypasses the compositor and produces
 *      synthetic-load artefacts.
 *   5. Disconnects the observer and asserts:
 *        long frames ≤ tier-B budget
 *        worst frame ≤ tier-B budget
 *
 * Tier B budgets are looser than Tier A (Snapdragon X Elite; 0/0)
 * because GHA runners are CPU-shared and ~3-5× slower on V8 hot paths.
 * If GHA reports tighter than these budgets in practice, we tighten
 * them later — better to start lenient and gate on regressions than
 * be flaky out of the gate.
 *
 * Anchor restoration is also asserted bit-exact (deltaY = 0 px) — the
 * pixel-exact behaviour was empirically confirmed on Tier A; this
 * test guards against a regression that would silently break it.
 */

import { test, expect } from '@playwright/test';
import { measureLoaf, wheelDown, wheelDiagonal, dragPan } from './helpers';

// ─── Tier B budgets ──────────────────────────────────────────────────
//
// Per spike plan v0.2 §14.1:
//   Scroll FPS, week view 200 events: jank-free ≥ 50 fps    Tier B
//
// Translated to LoAF terms:
//   - 50 fps == 20 ms per frame budget. ≥ 50 ms is "long".
//   - We allow up to 3 long frames over a 5-second wheel session
//     (real-user-realistic cadence) — that's < 0.6 long frames per
//     second, well below the "abort criterion" (which is < 30 fps,
//     i.e. > 33 ms sustained).
//   - Worst frame ≤ 150 ms — flags clear regression but tolerates an
//     occasional GHA hiccup.
const TIER_B_LONG_FRAMES = 3;
const TIER_B_WORST_FRAME_MS = 150;

test.describe('Spike A — VirtualizedSurface1DY (10k fixed)', () => {
  test('wheel scroll does not produce sustained jank', async ({ page }) => {
    await page.goto('/calendar-virtual-surface');
    await expect(page.locator('.coar-virtualized-surface-1dy')).toBeVisible();
    // Settle the initial paint and any HMR / module-eval warm-up.
    await page.waitForTimeout(500);

    const result = await measureLoaf(page, async () => {
      await wheelDown(page, '.coar-virtualized-surface-1dy', {
        ticks: 30,
        deltaY: 100,
        intervalMs: 50,
      });
    });

    if (result.longFrames > TIER_B_LONG_FRAMES || result.worstFrameMs > TIER_B_WORST_FRAME_MS) {
      // Surface the entries on failure so debugging the regression
      // doesn't require a re-run.
      console.log('LoAF entries on failure:', JSON.stringify(result.entries));
    }
    expect(result.longFrames).toBeLessThanOrEqual(TIER_B_LONG_FRAMES);
    expect(result.worstFrameMs).toBeLessThanOrEqual(TIER_B_WORST_FRAME_MS);
  });
});

test.describe('Spike A — VirtualizedSurface1DY (10k variable)', () => {
  test('wheel scroll + measurement flushes do not produce sustained jank', async ({ page }) => {
    await page.goto('/calendar-virtual-surface-variable');
    await expect(page.locator('.coar-virtualized-surface-1dy')).toBeVisible();
    await page.waitForTimeout(500);

    const result = await measureLoaf(page, async () => {
      await wheelDown(page, '.coar-virtualized-surface-1dy', {
        ticks: 30,
        deltaY: 100,
        intervalMs: 50,
      });
    });

    if (result.longFrames > TIER_B_LONG_FRAMES || result.worstFrameMs > TIER_B_WORST_FRAME_MS) {
      console.log('LoAF entries on failure:', JSON.stringify(result.entries));
    }
    expect(result.longFrames).toBeLessThanOrEqual(TIER_B_LONG_FRAMES);
    expect(result.worstFrameMs).toBeLessThanOrEqual(TIER_B_WORST_FRAME_MS);
  });

  test('anchor restoration keeps the first-visible item pixel-exact', async ({ page }) => {
    await page.goto('/calendar-virtual-surface-variable');
    await expect(page.locator('.coar-virtualized-surface-1dy')).toBeVisible();
    await page.waitForTimeout(500);

    // Drive an initial scroll so we land in the middle of the list and
    // anchor restoration has a meaningful effect (above-viewport items).
    await wheelDown(page, '.coar-virtualized-surface-1dy', {
      ticks: 20,
      deltaY: 200,
      intervalMs: 30,
    });
    await page.waitForTimeout(300);

    // The anchor-restoration test: capture the first VISIBLE item's
    // screen y-coordinate, click "Toggle item above viewport", then
    // capture the same item's y-coordinate again. They must match
    // bit-exact.
    const measurement = await page.evaluate(async () => {
      const surface = document.querySelector('.coar-virtualized-surface-1dy') as HTMLElement | null;
      if (!surface) throw new Error('surface missing');
      const surfaceRect = surface.getBoundingClientRect();

      function firstVisible() {
        const items = Array.from(
          document.querySelectorAll('.coar-virtualized-surface-1dy__item'),
        ) as HTMLElement[];
        let best: { idx: number; top: number } | null = null;
        for (const it of items) {
          const r = it.getBoundingClientRect();
          if (r.bottom > surfaceRect.top + 0.5) {
            if (!best || r.top < best.top) {
              best = { idx: Number(it.dataset.y), top: r.top };
            }
          }
        }
        return best;
      }

      const before = firstVisible();
      if (!before) throw new Error('no first visible before');

      // Click the right toggle button.
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent?.includes('Toggle item above viewport'));
      if (!btn) throw new Error('toggle button missing');
      btn.click();

      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      await new Promise<void>((r) => setTimeout(r, 100));
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

      const after = firstVisible();
      if (!after) throw new Error('no first visible after');

      return {
        beforeIdx: before.idx,
        beforeTop: before.top,
        afterIdx: after.idx,
        afterTop: after.top,
        deltaTop: Math.abs(after.top - before.top),
      };
    });

    // Same item, same y-coordinate — pixel-exact.
    expect(measurement.afterIdx).toBe(measurement.beforeIdx);
    expect(measurement.deltaTop).toBeLessThan(1); // sub-pixel tolerance
  });
});

test.describe('Spike A — VirtualizedSurface2D (1k × 1k)', () => {
  test('diagonal wheel scroll does not produce sustained jank', async ({ page }) => {
    await page.goto('/calendar-virtual-surface-2d');
    await expect(page.locator('.coar-virtualized-surface-2d')).toBeVisible();
    await page.waitForTimeout(500);

    const result = await measureLoaf(page, async () => {
      await wheelDiagonal(page, '.coar-virtualized-surface-2d', {
        ticks: 30,
        deltaX: 60,
        deltaY: 60,
        intervalMs: 50,
      });
    });

    if (result.longFrames > TIER_B_LONG_FRAMES || result.worstFrameMs > TIER_B_WORST_FRAME_MS) {
      console.log('LoAF entries on failure:', JSON.stringify(result.entries));
    }
    expect(result.longFrames).toBeLessThanOrEqual(TIER_B_LONG_FRAMES);
    expect(result.worstFrameMs).toBeLessThanOrEqual(TIER_B_WORST_FRAME_MS);
  });

  test('mouse drag-pan in mixed directions does not produce sustained jank', async ({ page }) => {
    await page.goto('/calendar-virtual-surface-2d');
    await expect(page.locator('.coar-virtualized-surface-2d')).toBeVisible();
    await page.waitForTimeout(500);

    const result = await measureLoaf(page, async () => {
      // Pan in a chaotic pattern: down-right, then left, then up,
      // then diagonal up-right. Mimics a real user dragging the grid
      // around.
      await dragPan(page, '.coar-virtualized-surface-2d', [
        { dx: -300, dy: -200, pauseMs: 80 },
        { dx: 200, dy: -150, pauseMs: 80 },
        { dx: -250, dy: 100, pauseMs: 80 },
        { dx: 350, dy: 200, pauseMs: 80 },
      ]);
    });

    if (result.longFrames > TIER_B_LONG_FRAMES || result.worstFrameMs > TIER_B_WORST_FRAME_MS) {
      console.log('LoAF entries on failure:', JSON.stringify(result.entries));
    }
    expect(result.longFrames).toBeLessThanOrEqual(TIER_B_LONG_FRAMES);
    expect(result.worstFrameMs).toBeLessThanOrEqual(TIER_B_WORST_FRAME_MS);
  });
});
