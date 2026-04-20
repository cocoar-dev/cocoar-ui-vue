import { test, expect } from '@playwright/test';

interface Measurement {
  rows: number;
  viewport_bb_h: number;
  viewport_style_h: string;
  container_bb_h: number;
  container_style_h: string;
  firstRow_bb_h: number | null;
  firstRow_visible: boolean | null;
  firstRow_style_top: string | null;
  // Flex column diagnostics
  titleCell_inlineStyle: string | null;
  titleCell_bb_w: number | null;
  idCell_inlineStyle: string | null;
}

async function measure(page: import('@playwright/test').Page): Promise<Measurement> {
  return page.evaluate(() => {
    const viewport = document.querySelector('.ag-center-cols-viewport') as HTMLElement | null;
    const container = document.querySelector('.ag-center-cols-container') as HTMLElement | null;
    if (!viewport || !container) throw new Error('viewport/container not found');
    const vRect = viewport.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    const vStyle = getComputedStyle(viewport);
    const cStyle = getComputedStyle(container);
    const rowEls = container.querySelectorAll('.ag-row');
    const firstRow = rowEls[0] as HTMLElement | undefined;
    const firstRect = firstRow ? firstRow.getBoundingClientRect() : null;
    const cells = firstRow ? firstRow.querySelectorAll('.ag-cell') : null;
    const titleCell = cells && cells[1] as HTMLElement | undefined; // 2nd column = Title (flex)
    const idCell = cells && cells[0] as HTMLElement | undefined;    // 1st column = ID (width 80)
    return {
      rows: rowEls.length,
      viewport_bb_h: vRect.height,
      viewport_style_h: vStyle.height,
      container_bb_h: cRect.height,
      container_style_h: cStyle.height,
      firstRow_bb_h: firstRect ? firstRect.height : null,
      firstRow_visible: firstRect && vRect ? !(firstRect.bottom <= vRect.top || firstRect.top >= vRect.bottom) : null,
      firstRow_style_top: firstRow ? firstRow.style.top : null,
      titleCell_inlineStyle: titleCell ? titleCell.getAttribute('style') : null,
      titleCell_bb_w: titleCell ? titleCell.getBoundingClientRect().width : null,
      idCell_inlineStyle: idCell ? idCell.getAttribute('style') : null,
    };
  });
}

test('GATING TEST: empty mount with narrow grid → grid grows → first row arrives → flex SHOULD recompute', async ({ page }) => {
  await page.goto('/empty-tree-to-first-row');
  await page.waitForSelector('.ag-center-cols-viewport', { state: 'attached' });

  // Phase 1: grid mounted with WIDE sidebar (= NARROW grid), 0 rows
  const phase1 = await measure(page);
  console.log('PHASE 1 (narrow grid, 0 rows):', JSON.stringify(phase1, null, 2));

  // Phase 2: collapse sidebar BEFORE adding row → grid is now WIDE, still 0 rows
  await page.getByTestId('toggle-sidebar').click();
  await page.waitForTimeout(300);
  const phase2 = await measure(page);
  console.log('PHASE 2 (wide grid, still 0 rows):', JSON.stringify(phase2, null, 2));

  // Phase 3: NOW add the first row. Grid is wide. Flex column should be wide.
  // Without the gating fix, flexApplied would already be true (set during empty mount),
  // and flex would not recompute → cell stays narrow.
  await page.getByTestId('add-row').click();
  await page.waitForTimeout(300);
  const phase3 = await measure(page);
  console.log('PHASE 3 (wide grid, +1 row):', JSON.stringify(phase3, null, 2));

  // The fix should give us a wide title cell here (flex recomputed from wide width)
  expect(phase3.titleCell_bb_w).toBeGreaterThan(500);
});

test('tree mode: flex column does NOT recompute when grid grows AFTER first row', async ({ page }) => {
  await page.goto('/empty-tree-to-first-row');
  await page.waitForSelector('.ag-center-cols-viewport', { state: 'attached' });

  // Mount state: sidebar is wide → grid is narrow → flex column gets tiny width
  const narrow = await measure(page);
  console.log('NARROW (0 rows, wide sidebar):', JSON.stringify(narrow, null, 2));

  // Add a row while grid is still narrow — flex computes from narrow available width
  await page.getByTestId('add-row').click();
  await page.waitForTimeout(300);
  const narrowWithRow = await measure(page);
  console.log('NARROW + 1 row:', JSON.stringify(narrowWithRow, null, 2));

  // Collapse sidebar → grid container width grows. Does flex re-compute?
  await page.getByTestId('toggle-sidebar').click();
  await page.waitForTimeout(500);
  const wideAfterCollapse = await measure(page);
  console.log('WIDE after sidebar collapse:', JSON.stringify(wideAfterCollapse, null, 2));

  expect(wideAfterCollapse.rows).toBe(1);
});

test('tree mode: empty → first row added (TodoGrid pattern)', async ({ page }) => {
  page.on('console', (m) => console.log(`[browser ${m.type()}]`, m.text()));
  page.on('pageerror', (e) => console.log('[browser pageerror]', e.message));
  await page.goto('/empty-tree-to-first-row');
  await page.waitForTimeout(1500);
  const debug = await page.evaluate(() => ({
    bodyHtml: document.body.innerHTML.slice(0, 2000),
    hasViewport: !!document.querySelector('.ag-center-cols-viewport'),
    hasGridRoot: !!document.querySelector('.ag-root'),
    hasCoarGrid: !!document.querySelector('.coar-data-grid'),
  }));
  console.log('DEBUG:', JSON.stringify(debug, null, 2));
  await page.waitForSelector('.ag-center-cols-viewport', { state: 'attached', timeout: 5000 });

  const initial = await measure(page);
  console.log('INITIAL (0 rows):', JSON.stringify(initial, null, 2));

  await page.getByTestId('add-row').click();
  await page.waitForTimeout(300);

  const afterFirst = await measure(page);
  console.log('AFTER FIRST ROW:', JSON.stringify(afterFirst, null, 2));

  // Use Playwright's own visibility check — this is what the consumer's failing test does
  const cell = page.locator('.coar-tree-cell__content').first();
  let visibleByPlaywright: boolean;
  try {
    await expect(cell).toBeVisible({ timeout: 1000 });
    visibleByPlaywright = true;
  } catch {
    visibleByPlaywright = false;
  }
  console.log('PLAYWRIGHT toBeVisible() PASS?', visibleByPlaywright);

  const clipped = afterFirst.rows > 0 && afterFirst.viewport_bb_h < (afterFirst.firstRow_bb_h ?? 0);
  console.log('VIEWPORT CLIPPED?', clipped);

  expect(afterFirst.rows).toBe(1);
});
