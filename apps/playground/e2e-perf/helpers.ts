/**
 * Helpers for the calendar perf lane.
 *
 * The headline measurement is the **Long Animation Frame API**
 * (`PerformanceObserver({ type: 'long-animation-frame' })`), which
 * reports actual ≥ 50 ms frames from Chrome's render pipeline. It is
 * the authoritative jank signal — `requestAnimationFrame` deltas are
 * unreliable under input dispatch and tell you nothing useful about
 * compositor smoothness.
 *
 * The helpers here:
 *
 *   1. Install a `PerformanceObserver` in the page context before the
 *      action runs.
 *   2. Run the supplied scroll action.
 *   3. Wait one rAF + a small grace for any straggling LoAF entries
 *      to flush.
 *   4. Disconnect the observer and return aggregated metrics.
 *
 * This gives us a clean before/after window, no leakage from prior
 * tests or page warm-up frames.
 */

import type { Page } from '@playwright/test';

export interface LoafResult {
  /** Number of frames ≥ 50 ms during the action window. */
  longFrames: number;
  /** Worst single-frame duration in milliseconds. 0 if no entries. */
  worstFrameMs: number;
  /** All entries (for debugging on failure). */
  entries: ReadonlyArray<{ duration: number; startTime: number }>;
  /** Wall-clock duration of the measurement window in milliseconds. */
  windowMs: number;
}

declare global {
  interface Window {
    __loafEntries?: { duration: number; startTime: number }[];
    __loafObserver?: PerformanceObserver;
    __loafStart?: number;
  }
}

/**
 * Install a LoAF observer in the page context. Call before the action.
 * Returns a Promise that resolves once the observer is armed.
 */
export async function startLoafObservation(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__loafEntries = [];
    window.__loafStart = performance.now();
    const supports =
      typeof PerformanceObserver !== 'undefined' &&
      PerformanceObserver.supportedEntryTypes?.includes('long-animation-frame');
    if (!supports) {
      // Caller decides what to do; we still provide a no-op observer
      // so stop() doesn't crash.
      window.__loafObserver = new PerformanceObserver(() => {});
      return;
    }
    window.__loafObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__loafEntries!.push({
          duration: entry.duration,
          startTime: entry.startTime,
        });
      }
    });
    window.__loafObserver.observe({ type: 'long-animation-frame', buffered: false });
  });
}

/**
 * Disconnect the observer and harvest results. Call after the action.
 */
export async function stopLoafObservation(page: Page): Promise<LoafResult> {
  // Two rAF + 200 ms grace so any pending LoAF entries land before
  // we disconnect.
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );
  await page.waitForTimeout(200);

  return page.evaluate(() => {
    window.__loafObserver?.disconnect();
    const entries = window.__loafEntries ?? [];
    let worst = 0;
    for (const e of entries) if (e.duration > worst) worst = e.duration;
    return {
      longFrames: entries.length,
      worstFrameMs: Math.round(worst),
      entries: entries.map((e) => ({
        duration: Math.round(e.duration),
        startTime: Math.round(e.startTime),
      })),
      windowMs: Math.round(performance.now() - (window.__loafStart ?? 0)),
    };
  });
}

/**
 * Convenience: wrap an action in start/stop. Returns the LoafResult.
 */
export async function measureLoaf(
  page: Page,
  action: () => Promise<void>,
): Promise<LoafResult> {
  await startLoafObservation(page);
  await action();
  return stopLoafObservation(page);
}

/**
 * Drive a vertical wheel scroll on the centre of an element. Uses
 * Playwright's `mouse.wheel` which dispatches real wheel events
 * through Chrome's input pipeline — NOT a JS `scrollBy()` call.
 *
 * `ticks × deltaY` total scroll. `intervalMs` between ticks (default
 * 50 ms ≈ real wheel cadence; aggressive bursts at 30 ms cadence
 * have been observed to artificially produce single boundary-50 ms
 * long frames in earlier instrumentation, so we stay at realistic
 * pacing).
 */
export async function wheelDown(
  page: Page,
  selector: string,
  opts: { ticks?: number; deltaY?: number; intervalMs?: number } = {},
): Promise<void> {
  const ticks = opts.ticks ?? 30;
  const deltaY = opts.deltaY ?? 80;
  const intervalMs = opts.intervalMs ?? 50;

  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`No bounding box for selector "${selector}"`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

  for (let i = 0; i < ticks; i++) {
    await page.mouse.wheel(0, deltaY);
    await page.waitForTimeout(intervalMs);
  }
}

/**
 * Diagonal scroll burst: vertical wheel + shift-wheel for horizontal,
 * alternating to produce mixed-axis input. Same realistic pacing as
 * wheelDown.
 */
export async function wheelDiagonal(
  page: Page,
  selector: string,
  opts: { ticks?: number; deltaX?: number; deltaY?: number; intervalMs?: number } = {},
): Promise<void> {
  const ticks = opts.ticks ?? 30;
  const deltaX = opts.deltaX ?? 60;
  const deltaY = opts.deltaY ?? 60;
  const intervalMs = opts.intervalMs ?? 50;

  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`No bounding box for selector "${selector}"`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

  for (let i = 0; i < ticks; i++) {
    // Both axes via the same wheel event; Chrome routes deltaX through
    // the horizontal scroll pipeline.
    await page.mouse.wheel(deltaX, deltaY);
    await page.waitForTimeout(intervalMs);
  }
}

/**
 * Mouse-drag pan: pointer down, drag through a list of relative
 * offsets, pointer up. Useful for the 2D demo's pan handler.
 */
export async function dragPan(
  page: Page,
  selector: string,
  legs: ReadonlyArray<{ dx: number; dy: number; pauseMs?: number }>,
): Promise<void> {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`No bounding box for selector "${selector}"`);
  let cx = box.x + box.width / 2;
  let cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  try {
    for (const leg of legs) {
      const steps = 20;
      const stepX = leg.dx / steps;
      const stepY = leg.dy / steps;
      for (let i = 0; i < steps; i++) {
        cx += stepX;
        cy += stepY;
        await page.mouse.move(cx, cy);
        await page.waitForTimeout(8); // 125 Hz pointer-move
      }
      if (leg.pauseMs) await page.waitForTimeout(leg.pauseMs);
    }
  } finally {
    await page.mouse.up();
  }
}
