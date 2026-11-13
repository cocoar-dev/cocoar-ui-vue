import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Horizontal time grid (`timeGridOrientation('horizontal')`) in a real
 * browser: `/calendar-time-rows` (week of 19–25 Oct 2026, 06–20 h,
 * 15-min slots). Every hook logs a line into `[data-testid=log]`.
 */

const card = (page: Page, day: string, title: string): Locator =>
  page.locator(`[data-day-key="${day}"] .coar-time-rows-event`, { hasText: title });
const row = (page: Page, day: string): Locator =>
  page.locator(`.coar-time-rows__row[data-day-key="${day}"]`);
const track = (page: Page, day: string): Locator =>
  row(page, day).locator('.coar-time-rows__track');
const log = (page: Page): Locator => page.getByTestId('log');

/** Pixels per minute as rendered: one hour label to the next. */
async function pxPerMinute(page: Page): Promise<number> {
  const xs = await page
    .locator('.coar-time-rows__hour-label')
    .evaluateAll((els) => els.slice(0, 2).map((el) => parseFloat((el as HTMLElement).style.left)));
  return (xs[1] - xs[0]) / 60;
}

/**
 * Returns the client point `at()` gives, after scrolling the grid's own scroller so that the
 * point lands on `target` (only when it does not already: a no-op at desktop sizes). The
 * webkit-tablet project runs at the iPad viewport, where most of the day is scrolled out.
 */
async function pointInView(
  page: Page,
  target: Locator,
  at: () => Promise<{ x: number; y: number }>,
): Promise<{ x: number; y: number }> {
  const hits = (p: { x: number; y: number }) =>
    target.evaluate((el, q) => {
      const hit = document.elementFromPoint(q.x, q.y);
      return !!hit && el.contains(hit);
    }, p);
  let p = await at();
  if (!(await hits(p))) {
    await page.locator('.coar-time-rows__scroller').evaluate((el, x) => {
      const r = el.getBoundingClientRect();
      el.scrollLeft += x - (r.left + r.width / 2);
    }, p.x);
    p = await at();
  }
  expect(await hits(p), 'the tapped point lies on its target').toBe(true);
  return p;
}

test.beforeEach(async ({ page }, testInfo) => {
  // webkit-tablet keeps the iPad viewport (810×1080): its @touch tests scroll the grid's own
  // scroller to what they tap. Every other project keeps the desktop size the tests were written for.
  if (testInfo.project.name !== 'webkit-tablet') {
    await page.setViewportSize({ width: 1400, height: 900 });
  }
  await page.goto('/calendar-time-rows');
  await expect(row(page, '2026-10-19')).toBeVisible();
});

test('orientation toggle switches between rows and columns', async ({ page }) => {
  await expect(page.locator('.coar-time-rows__row')).toHaveCount(7);
  await page.getByTestId('orientation-vertical').click();
  await expect(page.locator('.coar-time-rows')).toHaveCount(0);
  await expect(page.locator('.coar-time-grid')).toHaveCount(1);
  await page.getByTestId('orientation-horizontal').click();
  await expect(page.locator('.coar-time-rows__row')).toHaveCount(7);
});

test('drag a card to another row moves it to that day, an hour later', async ({ page }) => {
  const ppm = await pxPerMinute(page);
  const source = card(page, '2026-10-19', 'Learning');
  const box = (await source.boundingBox())!;
  const target = (await row(page, '2026-10-22').boundingBox())!;
  const x0 = box.x + 10;
  const y0 = box.y + box.height / 2;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x0 + 30 * ppm, (y0 + target.y + 20) / 2, { steps: 5 });
  await page.mouse.move(x0 + 60 * ppm, target.y + 20, { steps: 5 });
  await page.mouse.up();
  await expect(log(page)).toContainText('drop: Learning → 2026-10-22 13:30–14:30');
  await expect(card(page, '2026-10-22', 'Learning')).toBeVisible();
  await expect(card(page, '2026-10-19', 'Learning')).toHaveCount(0);
});

test('drag the right edge to make an event longer', async ({ page }) => {
  const ppm = await pxPerMinute(page);
  const review = card(page, '2026-10-20', 'Review');
  const box = (await review.boundingBox())!;
  const x0 = box.x + box.width - 2;
  const y0 = box.y + box.height / 2;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x0 + 45 * ppm, y0, { steps: 6 });
  await page.mouse.up();
  await expect(log(page)).toContainText('drop: Review → 2026-10-20 10:30–12:15');
});

test('a click on an empty track reports the slot time', async ({ page }) => {
  const ppm = await pxPerMinute(page);
  const t = (await track(page, '2026-10-22').boundingBox())!;
  // 06:00 + 4 h 20 min → 10:15 on the 15-minute grid.
  await page.mouse.click(t.x + (4 * 60 + 20) * ppm, t.y + 10);
  await expect(log(page)).toContainText('timeClick: 2026-10-22 10:15');
});

test.describe('touch', () => {
  test.use({ hasTouch: true });

  test('a tap on an empty track reports the slot time', { tag: '@touch' }, async ({ page }) => {
    const ppm = await pxPerMinute(page);
    const p = await pointInView(page, track(page, '2026-10-22'), async () => {
      const t = (await track(page, '2026-10-22').boundingBox())!;
      return { x: t.x + (2 * 60 + 5) * ppm, y: t.y + 10 };
    });
    await page.touchscreen.tap(p.x, p.y);
    await expect(log(page)).toContainText('timeClick: 2026-10-22 08:00');
  });

  test(
    "a tap on a card opens the sheet, and the tap's click does not close it",
    { tag: '@touch' },
    async ({ page }) => {
      const meeting = card(page, '2026-10-21', 'Meeting');
      const p = await pointInView(page, meeting, async () => {
        const box = (await meeting.boundingBox())!;
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      });
      await page.touchscreen.tap(p.x, p.y);
      await page.waitForTimeout(500);
      await expect(page.getByTestId('sheet')).toHaveText('Meeting');
    },
  );

  // Not tagged @touch: drives touch through CDP (`Input.dispatchTouchEvent`), which exists in
  // Chromium only, so it cannot run in the webkit-tablet project.
  test('a horizontal swipe scrolls the time axis and does not page the week', async ({ page }) => {
    const scroller = page.locator('.coar-time-rows__scroller');
    const t = (await track(page, '2026-10-22').boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const y = t.y + 10;
    const x0 = t.x + 600;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] });
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x0 - i * 40, y }],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(400);
    expect(await scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
    await expect(row(page, '2026-10-19')).toBeVisible();
    await expect(log(page)).not.toContainText('timeClick');
    // Only the initial range of this week was published — no paging.
    await expect(log(page)).not.toContainText('range: week 2026-10-12');
    await expect(log(page)).not.toContainText('range: week 2026-10-26');
  });
});
