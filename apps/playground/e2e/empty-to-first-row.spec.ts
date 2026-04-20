import { test, expect } from '@playwright/test';

interface Measurement {
  rows: number;
  viewport_bb_h: number;
  viewport_style_h: string;
  viewport_overflow: string;
  container_bb_h: number;
  container_style_h: string;
  rowEls: number;
  firstRow_bb_h: number | null;
  firstRow_visible: boolean | null;
}

async function measure(page: import('@playwright/test').Page): Promise<Measurement> {
  return page.evaluate(() => {
    const viewport = document.querySelector('.ag-center-cols-viewport') as HTMLElement | null;
    const container = document.querySelector('.ag-center-cols-container') as HTMLElement | null;
    if (!viewport || !container) {
      throw new Error('viewport/container not found');
    }
    const vRect = viewport.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    const vStyle = getComputedStyle(viewport);
    const cStyle = getComputedStyle(container);
    const rowEls = container.querySelectorAll('.ag-row');
    const firstRow = rowEls[0] as HTMLElement | undefined;
    const firstRect = firstRow ? firstRow.getBoundingClientRect() : null;
    return {
      rows: rowEls.length,
      viewport_bb_h: vRect.height,
      viewport_style_h: vStyle.height,
      viewport_overflow: vStyle.overflow + ' / overflow-y=' + vStyle.overflowY,
      container_bb_h: cRect.height,
      container_style_h: cStyle.height,
      rowEls: rowEls.length,
      firstRow_bb_h: firstRect ? firstRect.height : null,
      // Visible if intersects viewport rect
      firstRow_visible: firstRect && vRect ? !(firstRect.bottom <= vRect.top || firstRect.top >= vRect.bottom) : null,
    };
  });
}

async function runScenario(page: import('@playwright/test').Page, label: string) {
  await page.waitForSelector('.ag-center-cols-viewport');
  const initial = await measure(page);
  console.log(`[${label}] INITIAL (0 rows):`, JSON.stringify(initial));
  await page.getByTestId('add-row').click();
  await page.waitForTimeout(250);
  const afterFirst = await measure(page);
  console.log(`[${label}] AFTER FIRST ROW:`, JSON.stringify(afterFirst));
  const clipped = afterFirst.rows > 0 && afterFirst.viewport_bb_h < (afterFirst.firstRow_bb_h ?? 0);
  console.log(`[${label}] VIEWPORT CLIPPED?`, clipped);
  return { initial, afterFirst, clipped };
}

test('default domLayout: empty → first row', async ({ page }) => {
  await page.goto('/empty-to-first-row');
  await runScenario(page, 'default');
});

test('autoHeight domLayout: empty → first row', async ({ page }) => {
  await page.goto('/empty-to-first-row');
  await page.getByTestId('auto-height').check();
  // grid remounts via :key
  await page.waitForTimeout(200);
  await runScenario(page, 'autoHeight');
});
