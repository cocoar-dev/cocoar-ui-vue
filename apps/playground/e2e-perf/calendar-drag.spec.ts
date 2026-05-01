/**
 * Spike D — Tier B perf gate for `useCoarDrag` + `<VirtualizedSurface*>`.
 *
 * Drives a real drag-and-drop session via Playwright's pointer
 * primitives, including auto-scroll triggered by parking the
 * pointer in the bottom hot zone, then reversing to the top hot
 * zone. Asserts LoAF stays under the Tier B budget.
 */

import { test, expect, type Page } from '@playwright/test';
import { measureLoaf } from './helpers';

const TIER_B_LONG_FRAMES = 3;
const TIER_B_WORST_FRAME_MS = 150;

async function dragAndAutoScroll(page: Page): Promise<void> {
  const surface = page.locator('.coar-virtualized-surface-1dy');
  const box = await surface.boundingBox();
  if (!box) throw new Error('no surface bbox');

  // Pick a draggable row inside the viewport.
  const row = page.locator('.row').first();
  await expect(row).toBeVisible();
  const rowBox = await row.boundingBox();
  if (!rowBox) throw new Error('no row bbox');

  const startX = rowBox.x + 30;
  const startY = rowBox.y + rowBox.height / 2;
  const bottomHotY = box.y + box.height - 5;
  const topHotY = box.y + 5;
  const midX = box.x + box.width / 2;

  // pointerdown on the row, then drag to the bottom hot zone, hold,
  // reverse to the top hot zone, hold, release.
  await page.mouse.move(startX, startY);
  await page.mouse.down();

  // 30 steps to bottom hot zone.
  for (let i = 1; i <= 30; i++) {
    const t = i / 30;
    const x = startX + (midX - startX) * t;
    const y = startY + (bottomHotY - startY) * t;
    await page.mouse.move(x, y);
    await page.waitForTimeout(20);
  }

  // Hold at bottom hot zone for 800 ms (lets auto-scroll run).
  for (let i = 0; i < 40; i++) {
    await page.mouse.move(midX, bottomHotY);
    await page.waitForTimeout(20);
  }

  // Reverse to top hot zone.
  for (let i = 1; i <= 30; i++) {
    const t = i / 30;
    const y = bottomHotY + (topHotY - bottomHotY) * t;
    await page.mouse.move(midX, y);
    await page.waitForTimeout(20);
  }

  // Hold at top hot zone for 600 ms.
  for (let i = 0; i < 30; i++) {
    await page.mouse.move(midX, topHotY);
    await page.waitForTimeout(20);
  }

  await page.mouse.up();
  await page.waitForTimeout(200);
}

test.describe('Spike D — useCoarDrag + auto-scroll', () => {
  test('200-item drag with bidirectional auto-scroll has no sustained jank', async ({ page }) => {
    await page.goto('/calendar-drag');
    // Wait for the surface AND let the page settle (Vue mount, module
    // eval, etc.) BEFORE the LoAF observer is installed — otherwise
    // page-load frames pollute the perf measurement.
    await expect(page.locator('.coar-virtualized-surface-1dy')).toBeVisible();
    await page.waitForTimeout(800);

    const result = await measureLoaf(page, async () => {
      await dragAndAutoScroll(page);
    });

    if (result.longFrames > TIER_B_LONG_FRAMES || result.worstFrameMs > TIER_B_WORST_FRAME_MS) {
      console.log('LoAF entries on failure:', JSON.stringify(result.entries));
    }
    expect(result.longFrames).toBeLessThanOrEqual(TIER_B_LONG_FRAMES);
    expect(result.worstFrameMs).toBeLessThanOrEqual(TIER_B_WORST_FRAME_MS);
  });

  test('drop completes and updates the lastDrop indicator', async ({ page }) => {
    await page.goto('/calendar-drag');
    await expect(page.locator('.coar-virtualized-surface-1dy')).toBeVisible();
    await page.waitForTimeout(800);

    const row = page.locator('.row').first();
    const rowBox = await row.boundingBox();
    if (!rowBox) throw new Error('no row bbox');

    const startX = rowBox.x + 30;
    const startY = rowBox.y + rowBox.height / 2;

    // Same input pattern as the passing perf test (which we know
    // exercises startDrag because auto-scroll fires).
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) {
      const t = i / 12;
      await page.mouse.move(startX + 20, startY + 64 * 3 * t);
      await page.waitForTimeout(20);
    }
    await page.mouse.up();
    await page.waitForTimeout(400);

    // Last-drop indicator should now show a target.
    const lastDrop = page.locator('.metric:has-text("Last drop") .metric__value');
    const text = await lastDrop.textContent();
    expect(text?.trim()).not.toBe('—');
    expect(text).toMatch(/item-\d+ → \d+ (before|after)/);
  });
});
