import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Bottom sheets of `useDialog` (`presentation: 'sheet'`) on `/mobile-form`, operated by tap:
 * the "Edit details" form sheet (taller than a phone screen, Save/Cancel in
 * `CoarDialogFooter`) and the "Delete" confirmation. Runs in `chromium` (desktop Chrome with
 * touch), `webkit-tablet` and `webkit-phone`.
 *
 * Playwright has no touch drag without CDP: the drags dispatch the pointer events a finger
 * sends (`pointerType: 'touch'`) to the handle, as the browser does once the sheet holds the
 * pointer capture. A real finger scroll cannot be simulated either: the scroll test taps a
 * field below the fold, which scrolls the sheet's content to it, and checks that the page
 * behind did not move.
 */

test.use({ hasTouch: true });

const status = (page: Page): Locator => page.getByTestId('form-status');
const detailsSheet = (page: Page): Locator => page.getByRole('dialog', { name: 'Edit details' });
const confirmSheet = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Delete the event?' });

test.beforeEach(async ({ page }) => {
  await page.goto('/mobile-form');
  await expect(page.getByRole('heading', { name: 'Mobile form' })).toBeVisible();
});

/** Waits until the sheet's slide-in (or spring-back) has ended. */
async function settled(sheet: Locator): Promise<void> {
  await sheet.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
}

async function openDetails(page: Page): Promise<Locator> {
  await page.getByTestId('action-details').tap();
  const sheet = detailsSheet(page);
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveClass(/coar-sheet/);
  await settled(sheet);
  return sheet;
}

/**
 * Drags the handle of `sheet` down by `dy` px in small steps, then holds still for 200 ms
 * before lifting: the release has no velocity, so only the distance decides.
 */
async function dragHandle(page: Page, sheet: Locator, dy: number): Promise<void> {
  const handle = sheet.locator('.coar-sheet-handle-area');
  const box = await handle.boundingBox();
  if (!box) throw new Error('handle not visible');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const init = (clientY: number, buttons: number) => ({
    pointerId: 41,
    pointerType: 'touch',
    isPrimary: true,
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons,
    clientX: x,
    clientY,
  });
  await handle.dispatchEvent('pointerdown', init(y, 1));
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    await handle.dispatchEvent('pointermove', init(y + (dy * i) / steps, 1));
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(200);
  await handle.dispatchEvent('pointerup', init(y + dy, 0));
}

test.describe('bottom sheet', { tag: '@touch' }, () => {
  test('measures the fixed frame without counting a classic horizontal scrollbar', async ({
    playwright, browserName, baseURL,
  }) => {
    test.skip(browserName !== 'chromium', 'Classic scrollbar launch flags are Chromium-specific.');
    const browser = await playwright.chromium.launch({
      // Playwright normally hides scrollbars; that cannot exercise this regression.
      ignoreDefaultArgs: ['--hide-scrollbars'],
      args: ['--disable-features=OverlayScrollbar'],
    });
    try {
      const context = await browser.newContext({
        baseURL, hasTouch: true, viewport: { width: 500, height: 700 },
      });
      const page = await context.newPage();
      await page.goto('/mobile-form');
      // Model host CSS retaining a classic scrollbar despite the page scroll lock.
      await page.addStyleTag({ content: `
        html { overflow-x: scroll !important; }
        body::after { content: ''; display: block; width: 2000px; height: 1px; }
        ::-webkit-scrollbar { width: 15px; height: 15px; }
      ` });
      const sheet = await openDetails(page);
      expect(await page.evaluate(() => ({
        inner: innerHeight, client: document.documentElement.clientHeight,
        visual: visualViewport!.height,
      }))).toEqual({ inner: 700, client: 685, visual: 685 });
      await expect.poll(() => sheet.evaluate((el) => (el as HTMLElement).style.bottom)).toBe('0px');
      expect((await sheet.boundingBox())!.y + (await sheet.boundingBox())!.height)
        .toBeCloseTo(685, 1);
    } finally {
      await browser.close();
    }
  });

  test('with very little height the whole sheet scrolls, keeping fields and footer reachable', async ({ page, browserName }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/visual.html#/visual/sheet-keyboard-short?mode=mobile&scheme=light');
    const sheet = page.getByRole('dialog', { name: 'Edit details' });
    await expect(sheet).toHaveClass(/coar-sheet--compact/);
    await settled(sheet);
    const notes = sheet.getByRole('textbox', { name: 'Notes', exact: true });
    await notes.focus();
    await expect.poll(async () => {
      const field = (await notes.boundingBox())!;
      const box = (await sheet.boundingBox())!;
      return field.y >= box.y - 1 && field.y + field.height <= box.y + box.height + 1;
    }).toBe(true);
    // Real wheel input over the inner viewport must chain to the sheet, not be trapped
    // by the normal body's overscroll containment or scroll the locked page.
    const field = (await notes.boundingBox())!;
    if (browserName === 'webkit') {
      // Playwright rejects wheel input in mobile WebKit. Check the chaining contract
      // and scroll geometry here; actual iOS finger gestures are checked natively.
      const inner = sheet.locator('.coar-sheet-body [data-overlayscrollbars-viewport]');
      await expect.poll(() => inner.evaluate((el) => getComputedStyle(el).overscrollBehaviorY))
        .toBe('auto');
      await sheet.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    } else {
      await page.mouse.move(field.x + field.width / 2, field.y + field.height / 2);
      await page.mouse.wheel(0, 1000);
    }
    await expect.poll(async () => {
      const save = (await sheet.getByRole('button', { name: 'Save', exact: true }).boundingBox())!;
      return save.y + save.height;
    }).toBeLessThanOrEqual(844 - 700);
    const save = (await sheet.getByRole('button', { name: 'Save', exact: true }).boundingBox())!;
    expect(save.y + save.height).toBeLessThanOrEqual(844 - 700);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });

  test('a host-neutral overlay inset keeps the footer and focused last field above the keyboard', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/visual.html#/visual/sheet-keyboard?mode=mobile&scheme=light');
    const sheet = page.getByRole('dialog', { name: 'Edit details' });
    await expect(sheet).toBeVisible();
    await settled(sheet);
    const notes = sheet.getByRole('textbox', { name: 'Notes', exact: true });
    await notes.focus();
    const keyboardTop = 844 - 328;
    await expect.poll(async () => (await sheet.boundingBox())!.y + (await sheet.boundingBox())!.height)
      .toBeCloseTo(keyboardTop, 1);
    const footer = (await sheet.locator('.coar-sheet-footer').boundingBox())!;
    await expect.poll(async () => {
      const field = (await notes.boundingBox())!;
      return field.y + field.height;
    }).toBeLessThanOrEqual(footer.y);
    expect(footer.y + footer.height).toBeLessThanOrEqual(keyboardTop);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });

  for (const visualViewport of [true, false]) {
    test(`keeps the handle below the top safe area (${visualViewport ? 'visual viewport' : 'CSS fallback'})`, async ({
      page,
      browserName,
    }) => {
      test.skip(browserName !== 'chromium', 'Safe-area emulation requires Chromium CDP.');
      await page.setViewportSize({ width: 390, height: 844 });
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47 } });
      if (!visualViewport) {
        await page.addInitScript(() => {
          Object.defineProperty(window, 'visualViewport', { value: null, configurable: true });
        });
      }
      await page.reload();
      // This is a real env() inset, not a larger top-gap token that could hide the regression.
      const safeTop = await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.paddingTop = 'env(safe-area-inset-top, 0px)';
        document.body.append(probe);
        const top = parseFloat(getComputedStyle(probe).paddingTop);
        probe.remove();
        return top;
      });
      expect(safeTop).toBe(47);

      const sheet = await openDetails(page);
      const gap = await sheet.evaluate((el) =>
        parseFloat(getComputedStyle(el).getPropertyValue('--coar-sheet-top-gap')),
      );
      const box = (await sheet.boundingBox())!;
      expect(box.y).toBeCloseTo(safeTop + gap, 1);
      const handle = (await sheet.locator('.coar-sheet-handle-area').boundingBox())!;
      expect(handle.y).toBeGreaterThanOrEqual(safeTop + gap);
      await expect(sheet.getByRole('button', { name: 'Close dialog' })).toBeInViewport();
      await expect(sheet.getByRole('button', { name: 'Save', exact: true })).toBeInViewport();

      // A host with no top inset keeps the existing 24 px gap, also after an inset change.
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0 } });
      await expect.poll(async () => (await sheet.boundingBox())!.y).toBeCloseTo(gap, 1);
    });
  }

  test('the form sheet scrolls inside while the page behind stays put', async ({ page }) => {
    const sheet = await openDetails(page);
    const pageScroll = await page.evaluate(() => window.scrollY);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
      'hidden',
    );

    // Save and Cancel stand in the fixed footer, not in the scrolling content.
    const footer = sheet.locator('.coar-sheet-footer');
    await expect(footer.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(footer.getByRole('button', { name: 'Cancel' })).toBeVisible();

    // The content is taller than the sheet on a phone; the last field is reached by scrolling it.
    const viewport = sheet.locator('.coar-sheet-body [data-overlayscrollbars-viewport]');
    const notes = sheet.getByTestId('details-notes').getByRole('textbox');
    await notes.tap();
    await page.keyboard.type('Bring badges');
    await expect(notes).toHaveValue('Bring badges');
    const { scrollHeight, clientHeight, scrollTop } = await viewport.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollTop: el.scrollTop,
    }));
    if (scrollHeight > clientHeight) expect(scrollTop).toBeGreaterThan(0);
    await expect(footer.getByRole('button', { name: 'Save' })).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY)).toBe(pageScroll);

    await footer.getByRole('button', { name: 'Save' }).tap();
    await expect(sheet).toBeHidden();
    await expect(status(page)).toHaveText('Details saved: Anna Berger, Vienna');
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  });

  test('Cancel and the close button close it without a result', async ({ page }) => {
    let sheet = await openDetails(page);
    await sheet.locator('.coar-sheet-footer').getByRole('button', { name: 'Cancel' }).tap();
    await expect(sheet).toBeHidden();
    await expect(status(page)).toHaveText('Details kept');

    sheet = await openDetails(page);
    await sheet.getByRole('button', { name: 'Close dialog' }).tap();
    await expect(sheet).toBeHidden();
    await expect(status(page)).toHaveText('Details kept');
  });

  test('a tap on the backdrop above the sheet closes it', async ({ page }) => {
    const sheet = await openDetails(page);
    const box = await sheet.boundingBox();
    expect(box && box.y).toBeGreaterThan(12);
    await page.touchscreen.tap(20, 8);
    await expect(sheet).toBeHidden();
    await expect(status(page)).toHaveText('Details kept');
  });

  test('dragging the handle down far enough closes it', async ({ page }) => {
    const sheet = await openDetails(page);
    const box = await sheet.boundingBox();
    await dragHandle(page, sheet, Math.round(box!.height * 0.6));
    await expect(sheet).toBeHidden();
    await expect(status(page)).toHaveText('Details kept');
  });

  test('a too short drag springs back', async ({ page }) => {
    const sheet = await openDetails(page);
    const before = (await sheet.boundingBox())!;
    await dragHandle(page, sheet, 30);
    await settled(sheet);
    await expect(sheet).toBeVisible();
    await expect
      .poll(async () => Math.round((await sheet.boundingBox())!.y))
      .toBe(Math.round(before.y));
    await expect(status(page)).toHaveText('Editing details');
  });

  test('opened by keyboard, focus moves into the sheet and returns to the opener', async ({
    page,
  }) => {
    const opener = page.getByTestId('action-details');
    await opener.focus();
    await opener.press('Enter');
    const sheet = detailsSheet(page);
    await expect(sheet).toBeVisible();
    await expect(sheet.locator(':focus')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test('opened by tap, focus moves into the sheet', async ({ page, browserName }) => {
    const opener = page.getByTestId('action-details');
    const sheet = await openDetails(page);
    await expect(sheet.locator(':focus')).toHaveCount(1);
    await sheet.getByRole('button', { name: 'Close dialog' }).tap();
    await expect(sheet).toBeHidden();
    // Focus goes back to what was focused when the sheet opened. Chromium focuses a button on
    // a tap, so that is the opener. WebKit does not (and a tap blurs what had the focus): the
    // body was focused, so there is no opener to return to. The centered dialog behaves the
    // same; it is the engine, not the sheet.
    if (browserName === 'chromium') await expect(opener).toBeFocused();
  });

  test('the delete confirmation is a sheet that can be dragged away', async ({ page }) => {
    await page.getByTestId('action-delete').tap();
    const sheet = confirmSheet(page);
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveClass(/coar-sheet/);
    await settled(sheet);
    const box = await sheet.boundingBox();
    await dragHandle(page, sheet, Math.round(box!.height * 0.6));
    await expect(sheet).toBeHidden();
    await expect(status(page)).toHaveText('Kept');
  });
});
