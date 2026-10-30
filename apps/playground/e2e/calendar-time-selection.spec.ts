import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Time-range selection, hover indicator, draft and background bands in a
 * real browser: `/calendar-time-selection` (week of 19–25 Oct 2026,
 * 06–20 h, 15-min slots, `gapOrDurationPolicy({ minutes: 60 })`). Every
 * hook logs a line into `[data-testid=log]`; a selected range opens the
 * booking form whose times drive the draft.
 *
 * Tuesday 2026-10-20 has events 07:30–12:00 and 12:30–13:30 (free gap
 * 12:00–12:30, free after 13:30).
 */

const TUE = '2026-10-20';
const row = (page: Page, day: string): Locator =>
  page.locator(`.coar-time-rows__row[data-day-key="${day}"]`);
const track = (page: Page, day: string): Locator =>
  row(page, day).locator('.coar-time-rows__track');
const log = (page: Page): Locator => page.getByTestId('log');

/** Pixels per minute as rendered: one hour label to the next. */
async function pxPerMinute(page: Page, selector = '.coar-time-rows__hour-label'): Promise<number> {
  const prop = selector.includes('rows') ? 'left' : 'top';
  const xs = await page
    .locator(selector)
    .evaluateAll(
      (els, p) => els.slice(0, 2).map((el) => parseFloat((el as HTMLElement).style[p as 'left'])),
      prop,
    );
  return (xs[1] - xs[0]) / 60;
}

/** Client point in Tuesday's track at a minute of the day (range starts 06:00). */
async function rowPoint(page: Page, day: string, minuteOfDay: number) {
  const ppm = await pxPerMinute(page);
  const t = (await track(page, day).boundingBox())!;
  return { x: t.x + (minuteOfDay - 6 * 60) * ppm, y: t.y + t.height / 2 };
}

const hm = (h: number, m = 0) => h * 60 + m;

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 900 });
  await page.goto('/calendar-time-selection');
  await expect(row(page, TUE)).toBeVisible();
});

test.describe('days as rows, mouse', () => {
  test('a drag on free space selects the snapped range; the draft follows the form', async ({
    page,
  }) => {
    const a = await rowPoint(page, TUE, hm(14, 5));
    const b = await rowPoint(page, TUE, hm(16, 20));
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move((a.x + b.x) / 2, a.y + 40, { steps: 4 });
    await page.mouse.move(b.x, a.y + 60, { steps: 4 });
    // While dragging: the range in Tuesday's row and on the axis.
    await expect(track(page, TUE).locator('[data-time-selection]')).toBeVisible();
    await expect(page.locator('.coar-time-rows__hours [data-time-axis-marker]')).toContainText(
      '2:15 h',
    );
    await page.mouse.up();
    await expect(log(page)).toContainText(`range drag: ${TUE} 14:00–16:15`);
    await expect(log(page)).not.toContainText('timeClick');

    const draft = track(page, TUE).locator('[data-time-draft]');
    await expect(draft).toBeVisible();
    const ppm = await pxPerMinute(page);
    expect((await draft.boundingBox())!.width).toBeCloseTo(135 * ppm, 0);
    await page.getByTestId('form-end').fill('17:00');
    await expect.poll(async () => (await draft.boundingBox())!.width).toBeCloseTo(180 * ppm, 0);
    await page.getByTestId('form-cancel').click();
    await expect(draft).toHaveCount(0);
  });

  test('a drag stops at the neighbouring event', async ({ page }) => {
    const a = await rowPoint(page, TUE, hm(15));
    const b = await rowPoint(page, TUE, hm(12, 50));
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 6 });
    await page.mouse.up();
    await expect(log(page)).toContainText(`range drag: ${TUE} 13:30–15:00`);
  });

  test('Escape cancels a drag without a call', async ({ page }) => {
    const a = await rowPoint(page, TUE, hm(14));
    const b = await rowPoint(page, TUE, hm(16));
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 4 });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(track(page, TUE).locator('[data-time-selection]')).toHaveCount(0);
    await expect(log(page)).not.toContainText('range drag');
  });

  test('hover shows the time and the proposal: the gap, else an hour', async ({ page }) => {
    const ppm = await pxPerMinute(page);
    const gap = await rowPoint(page, TUE, hm(12, 10));
    await page.mouse.move(gap.x, gap.y);
    const sel = track(page, TUE).locator('[data-time-selection]');
    await expect(sel).toBeVisible();
    expect((await sel.boundingBox())!.width).toBeCloseTo(30 * ppm - 0, 0);
    await expect(page.locator('.coar-time-rows__hours [data-time-axis-marker]')).toHaveText(
      '12:15',
    );
    await expect(page.locator('.coar-time-rows__hover-line')).toBeVisible();
    const free = await rowPoint(page, TUE, hm(15, 5));
    await page.mouse.move(free.x, free.y);
    await expect.poll(async () => (await sel.boundingBox())!.width).toBeCloseTo(60 * ppm, 0);
    // Over the day label: nothing.
    const label = (await row(page, TUE).locator('.coar-time-rows__label').boundingBox())!;
    await page.mouse.move(label.x + 20, label.y + 10);
    await expect(sel).toHaveCount(0);
    await expect(page.locator('[data-time-axis-marker]')).toHaveCount(0);
  });

  test('a click is onTimeClick, then the proposal', async ({ page }) => {
    const p = await rowPoint(page, TUE, hm(15, 5));
    await page.mouse.click(p.x, p.y);
    await expect(log(page).locator('li').nth(0)).toHaveText(`range click: ${TUE} 15:00–16:00`);
    await expect(log(page).locator('li').nth(1)).toHaveText(`timeClick: ${TUE} 15:00`);
  });

  test('a press on an event still moves it, no selection', async ({ page }) => {
    const card = row(page, TUE).locator('.coar-time-rows-event', { hasText: 'Backlog' });
    const box = (await card.boundingBox())!;
    const ppm = await pxPerMinute(page);
    await page.mouse.move(box.x + 10, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 10 + 60 * ppm, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect(log(page)).toContainText(`drop: Backlog → ${TUE}`);
    await expect(log(page)).not.toContainText('range drag');
    await expect(log(page)).not.toContainText('range click');
  });

  test('bands sit behind the events and let clicks through', async ({ page }) => {
    const core = track(page, TUE).locator('.coar-calendar-band--core');
    await expect(core).toBeVisible();
    await expect(track(page, TUE).locator('.coar-calendar-band--max')).toContainText(
      'max. 10:30 h',
    );
    expect(await core.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
    // 14:00 lies in Tuesday's core band.
    const p = await rowPoint(page, TUE, hm(14, 5));
    await page.mouse.click(p.x, p.y);
    await expect(log(page)).toContainText(`range click: ${TUE} 14:00–15:00`);
  });
});

test.describe('days as columns, mouse', () => {
  /** Tuesday's column and the y of a minute of the day (the grid shows 06:00 on top). */
  async function columnAt(page: Page) {
    await page.getByTestId('orientation-vertical').click();
    const column = page.locator('.coar-time-grid-column').nth(1);
    await expect(column).toBeVisible();
    const ppm = await pxPerMinute(page, '.coar-time-grid__hour-label');
    const hour6 = (await page.locator('.coar-time-grid__hour-label').first().boundingBox())!;
    const yOf = (minuteOfDay: number) => hour6.y + hour6.height / 2 + (minuteOfDay - 360) * ppm;
    return { column, c: (await column.boundingBox())!, yOf };
  }

  test('a drag in a column selects on the day pressed', async ({ page }) => {
    const { column, c, yOf } = await columnAt(page);
    // Tuesday is free until 07:30.
    await page.mouse.move(c.x + c.width / 2, yOf(hm(6, 5)));
    await page.mouse.down();
    await page.mouse.move(c.x + c.width * 1.5, yOf(hm(7, 20)), { steps: 6 });
    await expect(column.locator('[data-time-selection]')).toBeVisible();
    await page.mouse.up();
    await expect(log(page)).toContainText(`range drag: ${TUE} 06:00–07:15`);
  });

  test('a click reports the slot under the pointer', async ({ page }) => {
    const { c, yOf } = await columnAt(page);
    await page.mouse.click(c.x + c.width / 2, yOf(hm(6, 40)));
    await expect(log(page).locator('li').nth(0)).toHaveText(`range click: ${TUE} 06:45–07:30`);
    await expect(log(page).locator('li').nth(1)).toHaveText(`timeClick: ${TUE} 06:30`);
  });
});

test.describe('touch', () => {
  test.use({ hasTouch: true });

  test('a long press and a drag select a range; the rows do not scroll', async ({ page }) => {
    const scroller = page.locator('.coar-time-rows__scroller');
    const a = await rowPoint(page, TUE, hm(14, 5));
    const b = await rowPoint(page, TUE, hm(16, 5));
    const before = await scroller.evaluate((el) => el.scrollLeft);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: a.x, y: a.y }],
    });
    await page.waitForTimeout(650);
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: a.x + ((b.x - a.x) * i) / 8, y: a.y }],
      });
    }
    await expect(track(page, TUE).locator('[data-time-selection]')).toBeVisible();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(log(page)).toContainText(`range drag: ${TUE} 14:00–16:00`);
    expect(await scroller.evaluate((el) => el.scrollLeft)).toBe(before);
    await expect(log(page)).not.toContainText('timeClick');
  });

  test('a quick swipe scrolls and selects nothing', async ({ page }) => {
    const scroller = page.locator('.coar-time-rows__scroller');
    const a = await rowPoint(page, TUE, hm(16));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: a.x, y: a.y }],
    });
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: a.x - i * 40, y: a.y }],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(700);
    expect(await scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
    await expect(log(page)).not.toContainText('range drag');
    await expect(log(page)).not.toContainText('range click');
  });

  test('a tap selects the proposal after onTimeClick', async ({ page }) => {
    const p = await rowPoint(page, TUE, hm(15, 5));
    await page.touchscreen.tap(p.x, p.y);
    await expect(log(page)).toContainText(`range click: ${TUE} 15:00–16:00`);
  });
});
